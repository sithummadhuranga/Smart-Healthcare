import { Request, Response } from 'express';
import axios from 'axios';
import { pool } from '../db/pool';
import { publishNotificationEvent } from '../services/rabbitmqPublisher';

type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  consultation_type: 'ONLINE' | 'PHYSICAL' | null;
  reason: string | null;
  status: AppointmentStatus;
  rejection_reason: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DoctorSlot {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  consultationType?: 'ONLINE' | 'PHYSICAL';
  maxBookings?: number;
  isBooked: boolean;
}

interface DoctorData {
  _id: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  specialty?: string;
  availableSlots?: DoctorSlot[];
}

interface PatientNotificationData {
  name?: string;
  email?: string;
  phone?: string;
}

interface DoctorNotificationData {
  name?: string;
  email?: string;
  phone?: string;
}

interface PgError extends Error {
  code?: string;
}

const APPOINTMENT_STATUS_VALUES: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
];

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isUniqueViolation(error: unknown): boolean {
  return (error as PgError)?.code === '23505';
}

function mapRow(row: AppointmentRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    slotId: row.slot_id,
    consultationType: row.consultation_type,
    reason: row.reason,
    status: row.status,
    rejectionReason: row.rejection_reason,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAppointmentOr404(id: string, res: Response): Promise<AppointmentRow | null> {
  if (!isUuid(id)) {
    res.status(400).json({ error: 'Invalid appointment id format' });
    return null;
  }

  const result = await pool.query<AppointmentRow>('SELECT * FROM appointments WHERE id = $1', [id]);

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Appointment not found' });
    return null;
  }

  return result.rows[0];
}

function canTransition(current: AppointmentStatus, next: AppointmentStatus): boolean {
  const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED', 'REJECTED'],
    CONFIRMED: ['PAID', 'CANCELLED'],
    PAID: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
    REJECTED: [],
  };

  return allowed[current].includes(next);
}

function combineScheduledAt(date: string, startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const d = new Date(date);
  d.setUTCHours(hours || 0, minutes || 0, 0, 0);
  return d.toISOString();
}

async function getActiveSlotBookingCount(
  doctorId: string,
  slotId: string,
  excludeAppointmentId?: string
): Promise<number> {
  const values: string[] = [doctorId, slotId];
  let excludeClause = '';

  if (excludeAppointmentId) {
    values.push(excludeAppointmentId);
    excludeClause = ` AND id <> $${values.length}`;
  }

  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM appointments
     WHERE doctor_id = $1
       AND slot_id = $2
       AND status NOT IN ('CANCELLED', 'REJECTED')${excludeClause}`,
    values
  );

  return Number(result.rows[0]?.count || 0);
}

async function getDoctorData(doctorId: string): Promise<DoctorData> {
  const doctorServiceUrl = process.env.DOCTOR_SERVICE_URL;
  if (!doctorServiceUrl) {
    throw new Error('DOCTOR_SERVICE_URL is not configured');
  }

  const response = await axios.get<DoctorData>(`${doctorServiceUrl}/api/doctors/${doctorId}`, {
    timeout: 8000,
  });

  return response.data;
}

async function ensurePatientProfile(authorization?: string): Promise<void> {
  if (!authorization) {
    return;
  }

  const patientServiceUrl = process.env.PATIENT_SERVICE_URL || 'http://patient-service:3002';

  try {
    await axios.get(`${patientServiceUrl}/api/patients/profile`, {
      headers: {
        Authorization: authorization,
      },
      timeout: 8000,
    });
  } catch (error) {
    console.warn('[appointment-service] Failed to ensure patient profile exists', error);
  }
}

async function getPatientNotificationData(userId: string): Promise<PatientNotificationData | null> {
  const patientServiceUrl = process.env.PATIENT_SERVICE_URL || 'http://patient-service:3002';

  try {
    const response = await axios.get(`${patientServiceUrl}/api/patients/internal/${encodeURIComponent(userId)}`, {
      timeout: 8000,
    });

    const payload = response.data as { patient?: PatientNotificationData } & PatientNotificationData;
    const patient = payload.patient ?? payload;

    return {
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
    };
  } catch (error) {
    return null;
  }
}

async function getDoctorNotificationData(userId: string): Promise<DoctorNotificationData | null> {
  const doctorServiceUrl = process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3003';

  try {
    const response = await axios.get<DoctorData>(
      `${doctorServiceUrl}/api/doctors/internal/user/${encodeURIComponent(userId)}`,
      {
        timeout: 8000,
      }
    );

    return {
      name: response.data.name,
      email: response.data.email,
      phone: response.data.phone,
    };
  } catch (error) {
    return null;
  }
}

export async function createAppointment(req: Request, res: Response): Promise<void> {
  try {
    const { doctorId, slotId, reason } = req.body as {
      doctorId?: string;
      slotId?: string;
      reason?: string;
    };

    if (!doctorId || !slotId) {
      res.status(400).json({ error: 'doctorId and slotId are required' });
      return;
    }

    let doctor: DoctorData;
    try {
      doctor = await getDoctorData(doctorId);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        res.status(404).json({ error: 'Doctor not found or not verified' });
        return;
      }
      res.status(502).json({ error: 'Failed to validate doctor/slot with doctor-service' });
      return;
    }

    const slot = doctor.availableSlots?.find((s) => s.slotId === slotId);
    if (!slot) {
      res.status(400).json({ error: 'Invalid slotId for selected doctor' });
      return;
    }
    const consultationType = slot.consultationType === 'PHYSICAL' ? 'PHYSICAL' : 'ONLINE';

    const doctorOwnerId = doctor.userId || doctorId;
    const slotCapacity = Math.max(1, Number(slot.maxBookings) || 1);
    const activeBookings = await getActiveSlotBookingCount(doctorOwnerId, slotId);

    if (activeBookings >= slotCapacity) {
      res.status(409).json({ error: 'This slot is already booked (fully booked)' });
      return;
    }

    const scheduledAt = combineScheduledAt(slot.date, slot.startTime);

    let inserted;
    try {
      inserted = await pool.query<AppointmentRow>(
        `INSERT INTO appointments (patient_id, doctor_id, slot_id, consultation_type, reason, status, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
         RETURNING *`,
        [req.user!.userId, doctorOwnerId, slotId, consultationType, reason || null, scheduledAt]
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: 'This time slot cannot be booked right now' });
        return;
      }
      throw error;
    }

    const appointment = inserted.rows[0];

    try {
      await ensurePatientProfile(req.headers.authorization as string | undefined);

      const [patientContact, doctorContact] = await Promise.all([
        getPatientNotificationData(appointment.patient_id),
        getDoctorNotificationData(appointment.doctor_id),
      ]);

      await publishNotificationEvent({
        event: 'appointment.booked',
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        slotId: appointment.slot_id,
        scheduledAt: appointment.scheduled_at,
        patientName: patientContact?.name || req.user!.name,
        patientEmail: patientContact?.email || req.user!.email,
        patientPhone: patientContact?.phone,
        doctorName: doctorContact?.name || doctor.name,
        doctorEmail: doctorContact?.email,
      });
    } catch (error) {
      console.error('[appointment-service] Failed to publish appointment.booked', error);
    }

    res.status(201).json(mapRow(appointment));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment' });
  }
}

export async function modifyAppointment(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await getAppointmentOr404(req.params.id, res);
    if (!appointment) {
      return;
    }

    if (appointment.patient_id !== req.user!.userId) {
      res.status(403).json({ error: 'You can only modify your own appointments' });
      return;
    }

    if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
      res.status(400).json({ error: `Cannot modify appointment from status ${appointment.status}` });
      return;
    }

    const { doctorId, slotId, reason } = req.body as {
      doctorId?: string;
      slotId?: string;
      reason?: string;
    };

    if (!doctorId || !slotId) {
      res.status(400).json({ error: 'doctorId and slotId are required' });
      return;
    }

    let doctor: DoctorData;
    try {
      doctor = await getDoctorData(doctorId);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        res.status(404).json({ error: 'Doctor not found or not verified' });
        return;
      }
      res.status(502).json({ error: 'Failed to validate doctor/slot with doctor-service' });
      return;
    }

    const slot = doctor.availableSlots?.find((s) => s.slotId === slotId);
    if (!slot) {
      res.status(400).json({ error: 'Invalid slotId for selected doctor' });
      return;
    }
    const consultationType = slot.consultationType === 'PHYSICAL' ? 'PHYSICAL' : 'ONLINE';

    const doctorOwnerId = doctor.userId || doctorId;
    const slotCapacity = Math.max(1, Number(slot.maxBookings) || 1);
    const activeBookings = await getActiveSlotBookingCount(doctorOwnerId, slotId, appointment.id);

    if (activeBookings >= slotCapacity) {
      res.status(409).json({ error: 'This slot is already booked (fully booked)' });
      return;
    }

    const scheduledAt = combineScheduledAt(slot.date, slot.startTime);
    let updated;
    try {
      updated = await pool.query<AppointmentRow>(
        `UPDATE appointments
         SET doctor_id = $2,
             slot_id = $3,
             consultation_type = $4,
             reason = $5,
             scheduled_at = $6,
             status = 'PENDING',
             rejection_reason = NULL,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [appointment.id, doctorOwnerId, slotId, consultationType, reason ?? appointment.reason, scheduledAt]
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: 'This time slot cannot be booked right now' });
        return;
      }
      throw error;
    }

    res.status(200).json(mapRow(updated.rows[0]));
  } catch (error) {
    res.status(500).json({ error: 'Failed to modify appointment' });
  }
}

export async function getAppointments(req: Request, res: Response): Promise<void> {
  try {
    const status = (req.query.status as string | undefined)?.toUpperCase();
    if (status && !APPOINTMENT_STATUS_VALUES.includes(status as AppointmentStatus)) {
      res.status(400).json({ error: 'Invalid status filter' });
      return;
    }

    const values: string[] = [];

    let query = 'SELECT * FROM appointments WHERE ';
    if (req.user!.role === 'patient') {
      values.push(req.user!.userId);
      query += `patient_id = $${values.length}`;
    } else if (req.user!.role === 'doctor') {
      values.push(req.user!.userId);
      query += `doctor_id = $${values.length}`;
    } else if (req.user!.role === 'admin') {
      // Admin can query across all appointments (optionally filtered by status).
      query += '1=1';
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    if (status) {
      values.push(status);
      query += ` AND status = $${values.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query<AppointmentRow>(query, values);
    res.status(200).json(result.rows.map(mapRow));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
}

export async function getAppointmentById(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await getAppointmentOr404(req.params.id, res);
    if (!appointment) {
      return;
    }

    const userId = req.user!.userId;
    const role = req.user!.role;
    const isOwner =
      role === 'admin' ||
      appointment.patient_id === userId ||
      appointment.doctor_id === userId;

    if (!isOwner) {
      res.status(403).json({ error: 'You are not allowed to access this appointment' });
      return;
    }

    res.status(200).json(mapRow(appointment));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
}

export async function cancelAppointment(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await getAppointmentOr404(req.params.id, res);
    if (!appointment) {
      return;
    }

    if (appointment.patient_id !== req.user!.userId) {
      res.status(403).json({ error: 'You can only cancel your own appointments' });
      return;
    }

    if (!canTransition(appointment.status, 'CANCELLED')) {
      res.status(400).json({ error: `Cannot cancel appointment from status ${appointment.status}` });
      return;
    }

    const updated = await pool.query<AppointmentRow>(
      `UPDATE appointments
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointment.id]
    );

    try {
      const [patientContact, doctorContact] = await Promise.all([
        getPatientNotificationData(appointment.patient_id),
        getDoctorNotificationData(appointment.doctor_id),
      ]);

      await publishNotificationEvent({
        event: 'appointment.cancelled',
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        cancelledBy: 'patient',
        scheduledAt: appointment.scheduled_at,
        patientName: patientContact?.name || req.user!.name,
        patientEmail: patientContact?.email || req.user!.email,
        patientPhone: patientContact?.phone,
        doctorName: doctorContact?.name,
        doctorEmail: doctorContact?.email,
        doctorPhone: doctorContact?.phone,
      });
    } catch (error) {
      console.error('[appointment-service] Failed to publish appointment.cancelled', error);
    }

    res.status(200).json(mapRow(updated.rows[0]));
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
}

export async function acceptAppointment(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await getAppointmentOr404(req.params.id, res);
    if (!appointment) {
      return;
    }

    if (appointment.doctor_id !== req.user!.userId) {
      res.status(403).json({ error: 'You can only accept your own appointment requests' });
      return;
    }

    if (!canTransition(appointment.status, 'CONFIRMED')) {
      res.status(400).json({ error: `Cannot accept appointment from status ${appointment.status}` });
      return;
    }

    const updated = await pool.query<AppointmentRow>(
      `UPDATE appointments
       SET status = 'CONFIRMED', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointment.id]
    );

    try {
      const patientContact = await getPatientNotificationData(appointment.patient_id);

      await publishNotificationEvent({
        event: 'appointment.confirmed',
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        patientName: patientContact?.name,
        patientEmail: patientContact?.email,
        patientPhone: patientContact?.phone,
        doctorName: req.user!.name,
        doctorEmail: req.user!.email,
      });
    } catch (error) {
      console.error('[appointment-service] Failed to publish appointment.confirmed', error);
    }

    res.status(200).json(mapRow(updated.rows[0]));
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept appointment' });
  }
}

export async function rejectAppointment(req: Request, res: Response): Promise<void> {
  try {
    const { reason } = req.body as { reason?: string };
    const appointment = await getAppointmentOr404(req.params.id, res);

    if (!appointment) {
      return;
    }

    if (appointment.doctor_id !== req.user!.userId) {
      res.status(403).json({ error: 'You can only reject your own appointment requests' });
      return;
    }

    if (!canTransition(appointment.status, 'REJECTED')) {
      res.status(400).json({ error: `Cannot reject appointment from status ${appointment.status}` });
      return;
    }

    const updated = await pool.query<AppointmentRow>(
      `UPDATE appointments
       SET status = 'REJECTED', rejection_reason = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointment.id, reason || null]
    );

    res.status(200).json(mapRow(updated.rows[0]));
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject appointment' });
  }
}

export async function completeAppointment(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await getAppointmentOr404(req.params.id, res);
    if (!appointment) {
      return;
    }

    if (appointment.doctor_id !== req.user!.userId) {
      res.status(403).json({ error: 'You can only complete your own appointments' });
      return;
    }

    if (!canTransition(appointment.status, 'COMPLETED')) {
      res.status(400).json({ error: `Cannot complete appointment from status ${appointment.status}` });
      return;
    }

    const updated = await pool.query<AppointmentRow>(
      `UPDATE appointments
       SET status = 'COMPLETED', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointment.id]
    );

    try {
      const patientContact = await getPatientNotificationData(appointment.patient_id);

      await publishNotificationEvent({
        event: 'consultation.completed',
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        patientName: patientContact?.name,
        patientEmail: patientContact?.email,
        doctorName: req.user!.name,
        doctorEmail: req.user!.email,
      });
    } catch (error) {
      console.error('[appointment-service] Failed to publish consultation.completed', error);
    }

    res.status(200).json(mapRow(updated.rows[0]));
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete appointment' });
  }
}

export async function getAllAppointmentsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const pageRaw = parseInt(String(req.query.page || '1'), 10);
    const limitRaw = parseInt(String(req.query.limit || '10'), 10);
    const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 10;
    const status = (req.query.status as string | undefined)?.toUpperCase();

    if (status && !APPOINTMENT_STATUS_VALUES.includes(status as AppointmentStatus)) {
      res.status(400).json({ error: 'Invalid status filter' });
      return;
    }

    const where = status ? 'WHERE status = $1' : '';
    const values: Array<string | number> = [];

    if (status) {
      values.push(status);
    }

    const countQuery = `SELECT COUNT(*)::int AS total FROM appointments ${where}`;
    const countResult = await pool.query<{ total: number }>(countQuery, values);
    const total = Number(countResult.rows[0]?.total || 0);

    const offset = (page - 1) * limit;
    values.push(limit, offset);
    const listQuery = `
      SELECT * FROM appointments
      ${where}
      ORDER BY created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const listResult = await pool.query<AppointmentRow>(listQuery, values);

    res.status(200).json({
      appointments: listResult.rows.map(mapRow),
      total,
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments for admin' });
  }
}

export async function markAppointmentPaid(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await getAppointmentOr404(req.params.id, res);
    if (!appointment) {
      return;
    }

    if (!canTransition(appointment.status, 'PAID')) {
      res.status(400).json({ error: `Cannot mark appointment as PAID from status ${appointment.status}` });
      return;
    }

    const updated = await pool.query<AppointmentRow>(
      `UPDATE appointments
       SET status = 'PAID', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointment.id]
    );

    res.status(200).json(mapRow(updated.rows[0]));
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark appointment as paid' });
  }
}

export async function startAppointment(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await getAppointmentOr404(req.params.id, res);
    if (!appointment) {
      return;
    }

    if (!canTransition(appointment.status, 'IN_PROGRESS')) {
      res.status(400).json({ error: `Cannot start appointment from status ${appointment.status}` });
      return;
    }

    const updated = await pool.query<AppointmentRow>(
      `UPDATE appointments
       SET status = 'IN_PROGRESS', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointment.id]
    );

    res.status(200).json(mapRow(updated.rows[0]));
  } catch (error) {
    res.status(500).json({ error: 'Failed to start appointment' });
  }
}

export async function startAppointmentByDoctor(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await getAppointmentOr404(req.params.id, res);
    if (!appointment) {
      return;
    }

    if (req.user!.role !== 'admin' && appointment.doctor_id !== req.user!.userId) {
      res.status(403).json({ error: 'You can only start your own appointments' });
      return;
    }

    if (!canTransition(appointment.status, 'IN_PROGRESS')) {
      res.status(400).json({ error: `Cannot start appointment from status ${appointment.status}` });
      return;
    }

    const updated = await pool.query<AppointmentRow>(
      `UPDATE appointments
       SET status = 'IN_PROGRESS', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointment.id]
    );

    res.status(200).json(mapRow(updated.rows[0]));
  } catch (error) {
    res.status(500).json({ error: 'Failed to start appointment' });
  }
}

export async function markPrescriptionIssued(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await getAppointmentOr404(req.params.id, res);
    if (!appointment) {
      return;
    }

    try {
      const patientContact = await getPatientNotificationData(appointment.patient_id);

      await publishNotificationEvent({
        event: 'prescription.issued',
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        patientName: patientContact?.name,
        patientEmail: patientContact?.email,
        doctorName: req.user!.name,
        doctorEmail: req.user!.email,
      });
    } catch (error) {
      console.error('[appointment-service] Failed to publish prescription.issued', error);
    }

    res.status(200).json({ message: 'Prescription issued event published' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish prescription event' });
  }
}

export async function getSlotBookingCountsInternal(req: Request, res: Response): Promise<void> {
  try {
    const { doctorId, slotIds } = req.body as { doctorId?: string; slotIds?: string[] };
    if (!doctorId || !Array.isArray(slotIds) || slotIds.length === 0) {
      res.status(400).json({ error: 'doctorId and non-empty slotIds are required' });
      return;
    }

    const sanitizedSlotIds = slotIds.filter((slotId) => typeof slotId === 'string' && slotId.trim().length > 0);
    if (!sanitizedSlotIds.length) {
      res.status(400).json({ error: 'slotIds must contain valid strings' });
      return;
    }

    const result = await pool.query<{ slot_id: string; count: number }>(
      `SELECT slot_id, COUNT(*)::int AS count
       FROM appointments
       WHERE doctor_id = $1
         AND slot_id = ANY($2::text[])
         AND status NOT IN ('CANCELLED', 'REJECTED')
       GROUP BY slot_id`,
      [doctorId, sanitizedSlotIds]
    );

    const counts: Record<string, number> = {};
    for (const slotId of sanitizedSlotIds) {
      counts[slotId] = 0;
    }
    for (const row of result.rows) {
      counts[row.slot_id] = Number(row.count || 0);
    }

    res.status(200).json({ counts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slot booking counts' });
  }
}
