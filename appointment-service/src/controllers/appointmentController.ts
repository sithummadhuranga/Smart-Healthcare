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
  isBooked: boolean;
}

interface DoctorData {
  _id: string;
  name: string;
  specialty?: string;
  availableSlots?: DoctorSlot[];
}

function mapRow(row: AppointmentRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    slotId: row.slot_id,
    reason: row.reason,
    status: row.status,
    rejectionReason: row.rejection_reason,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAppointmentOr404(id: string, res: Response): Promise<AppointmentRow | null> {
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
  d.setHours(hours || 0, minutes || 0, 0, 0);
  return d.toISOString();
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

    if (slot.isBooked) {
      res.status(409).json({ error: 'This slot is already booked' });
      return;
    }

    const conflict = await pool.query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1
         AND slot_id = $2
         AND status NOT IN ('CANCELLED', 'REJECTED')
       LIMIT 1`,
      [doctorId, slotId]
    );

    if (conflict.rows.length > 0) {
      res.status(409).json({ error: 'This slot is already booked' });
      return;
    }

    const scheduledAt = combineScheduledAt(slot.date, slot.startTime);

    const inserted = await pool.query<AppointmentRow>(
      `INSERT INTO appointments (patient_id, doctor_id, slot_id, reason, status, scheduled_at)
       VALUES ($1, $2, $3, $4, 'PENDING', $5)
       RETURNING *`,
      [req.user!.userId, doctorId, slotId, reason || null, scheduledAt]
    );

    const appointment = inserted.rows[0];

    try {
      await publishNotificationEvent({
        event: 'appointment.booked',
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        slotId: appointment.slot_id,
        scheduledAt: appointment.scheduled_at,
      });
    } catch (error) {
      console.error('[appointment-service] Failed to publish appointment.booked', error);
    }

    res.status(201).json(mapRow(appointment));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment' });
  }
}

export async function getAppointments(req: Request, res: Response): Promise<void> {
  try {
    const status = (req.query.status as string | undefined)?.toUpperCase();
    const values: string[] = [];

    let query = 'SELECT * FROM appointments WHERE ';
    if (req.user!.role === 'patient') {
      values.push(req.user!.userId);
      query += `patient_id = $${values.length}`;
    } else if (req.user!.role === 'doctor') {
      values.push(req.user!.userId);
      query += `doctor_id = $${values.length}`;
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
      await publishNotificationEvent({
        event: 'appointment.cancelled',
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        cancelledBy: 'patient',
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
      await publishNotificationEvent({
        event: 'appointment.confirmed',
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
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
      await publishNotificationEvent({
        event: 'consultation.completed',
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
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
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const status = (req.query.status as string | undefined)?.toUpperCase();

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

export async function markPrescriptionIssued(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await getAppointmentOr404(req.params.id, res);
    if (!appointment) {
      return;
    }

    try {
      await publishNotificationEvent({
        event: 'prescription.issued',
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
      });
    } catch (error) {
      console.error('[appointment-service] Failed to publish prescription.issued', error);
    }

    res.status(200).json({ message: 'Prescription issued event published' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish prescription event' });
  }
}
