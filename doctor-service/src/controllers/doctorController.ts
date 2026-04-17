import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Doctor, type DoctorSlot } from '../models/Doctor';
import { Prescription } from '../models/Prescription';

type SlotWithAvailability = DoctorSlot & {
  bookedCount: number;
  remainingCapacity: number;
};

function parseTimeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

async function fetchSlotBookingCounts(doctorUserId: string, slotIds: string[]): Promise<Map<string, number>> {
  if (!slotIds.length) return new Map<string, number>();

  const appointmentServiceUrl = process.env.APPOINTMENT_SERVICE_URL;
  if (!appointmentServiceUrl) {
    return new Map<string, number>();
  }

  try {
    const response = await axios.post<{ counts?: Record<string, number> }>(
      `${appointmentServiceUrl}/api/appointments/internal/slot-bookings`,
      {
        doctorId: doctorUserId,
        slotIds,
      },
      { timeout: 8000 }
    );

    const counts = response.data?.counts ?? {};
    return new Map<string, number>(Object.entries(counts).map(([slotId, count]) => [slotId, Number(count) || 0]));
  } catch {
    return new Map<string, number>();
  }
}

async function enrichDoctorSlots<T extends { userId?: string; availableSlots?: DoctorSlot[] }>(doctor: T): Promise<T & { availableSlots: SlotWithAvailability[] }> {
  const slots = Array.isArray(doctor.availableSlots) ? doctor.availableSlots : [];
  const slotIds = slots.map((slot) => slot.slotId);
  const counts = await fetchSlotBookingCounts(doctor.userId || '', slotIds);

  const enrichedSlots = slots.map((slot) => {
    const capacity = Math.max(1, Number(slot.maxBookings) || 1);
    const bookedCount = Math.max(0, counts.get(slot.slotId) || 0);
    const remainingCapacity = Math.max(0, capacity - bookedCount);
    return {
      ...slot,
      maxBookings: capacity,
      bookedCount,
      remainingCapacity,
      isBooked: remainingCapacity === 0,
    };
  });

  return {
    ...doctor,
    availableSlots: enrichedSlots,
  };
}

async function ensureDoctorProfile(req: Request) {
  const user = req.user!;
  let doctor = await Doctor.findOne({ userId: user.userId });

  if (!doctor) {
    doctor = await Doctor.create({
      userId: user.userId,
      name: user.name,
      email: user.email,
      specialty: '',
      bio: '',
      qualifications: [],
      consultationFee: 0,
      // Auth-service already blocks unverified doctors from logging in.
      // Any doctor reaching this point has been admin-verified in auth-service.
      isVerified: true,
      availableSlots: [],
    });
  } else {
    let dirty = false;

    // Keep profile identity fields synced with auth claims.
    if (doctor.name !== user.name) {
      doctor.name = user.name;
      dirty = true;
    }

    if (doctor.email !== user.email) {
      doctor.email = user.email;
      dirty = true;
    }

    // Backfill stale profiles created before verification flow fix.
    if (!doctor.isVerified) {
      doctor.isVerified = true;
      dirty = true;
    }

    if (dirty) {
      await doctor.save();
    }
  }

  return doctor;
}

export async function getDoctors(req: Request, res: Response): Promise<void> {
  try {
    const specialty = (req.query.specialty as string | undefined)?.trim();
    const filter: Record<string, unknown> = { isVerified: true };

    if (specialty) {
      filter.specialty = { $regex: specialty, $options: 'i' };
    }

    const doctors = await Doctor.find(filter)
      .select('userId name specialty bio consultationFee isVerified availableSlots')
      .lean();

    const withAvailability = await Promise.all(doctors.map((doctor) => enrichDoctorSlots(doctor)));
    res.status(200).json(withAvailability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
}

export async function getDoctorById(req: Request, res: Response): Promise<void> {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .select('userId name specialty bio consultationFee isVerified availableSlots')
      .lean();

    if (!doctor || !doctor.isVerified) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    const withAvailability = await enrichDoctorSlots(doctor);
    res.status(200).json(withAvailability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
}

export async function getDoctorByUserIdInternal(req: Request, res: Response): Promise<void> {
  try {
    const doctor = await Doctor.findOne({ userId: req.params.userId })
      .select('userId name email phone specialty bio consultationFee isVerified availableSlots')
      .lean();

    if (!doctor || !doctor.isVerified) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    const withAvailability = await enrichDoctorSlots(doctor);
    res.status(200).json(withAvailability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
}

export async function getDoctorProfile(req: Request, res: Response): Promise<void> {
  try {
    const doctor = await ensureDoctorProfile(req);
    const withAvailability = await enrichDoctorSlots(doctor.toObject());
    res.status(200).json(withAvailability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor profile' });
  }
}

export async function updateDoctorProfile(req: Request, res: Response): Promise<void> {
  try {
    const { specialty, bio, consultationFee, qualifications, phone } = req.body as {
      specialty?: string;
      bio?: string;
      consultationFee?: number;
      qualifications?: string[];
      phone?: string;
    };

    if (
      specialty === undefined &&
      bio === undefined &&
      consultationFee === undefined &&
      qualifications === undefined &&
      phone === undefined
    ) {
      res.status(400).json({
        error: 'Provide at least one field to update',
      });
      return;
    }

    if (qualifications !== undefined && !Array.isArray(qualifications)) {
      res.status(400).json({ error: 'qualifications must be an array of strings' });
      return;
    }

    if (phone !== undefined && typeof phone !== 'string') {
      res.status(400).json({ error: 'phone must be a string' });
      return;
    }

    if (consultationFee !== undefined && (!Number.isFinite(consultationFee) || consultationFee < 0)) {
      res.status(400).json({ error: 'consultationFee must be a non-negative number' });
      return;
    }

    const doctor = await ensureDoctorProfile(req);

    if (specialty !== undefined) {
      doctor.specialty = specialty;
    }

    if (bio !== undefined) {
      doctor.bio = bio;
    }

    if (consultationFee !== undefined) {
      doctor.consultationFee = consultationFee;
    }

    if (qualifications !== undefined) {
      doctor.qualifications = qualifications;
    }

    if (phone !== undefined) {
      const normalizedPhone = phone.trim();
      doctor.phone = normalizedPhone || undefined;
    }

    await doctor.save();

    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update doctor profile' });
  }
}

export async function getSchedule(req: Request, res: Response): Promise<void> {
  try {
    const doctor = await ensureDoctorProfile(req);
    const withAvailability = await enrichDoctorSlots(doctor.toObject());
    res.status(200).json(withAvailability.availableSlots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
}

export async function addScheduleSlot(req: Request, res: Response): Promise<void> {
  try {
    const { date, startTime, endTime, consultationType, maxBookings, slotDurationMinutes } = req.body as {
      date?: string;
      startTime?: string;
      endTime?: string;
      consultationType?: 'ONLINE' | 'PHYSICAL';
      maxBookings?: number;
      slotDurationMinutes?: number;
    };

    if (!date || !startTime || !endTime) {
      res.status(400).json({ error: 'date, startTime, and endTime are required' });
      return;
    }

    const normalizedType = (consultationType || 'ONLINE').toUpperCase() as 'ONLINE' | 'PHYSICAL';
    if (normalizedType !== 'ONLINE' && normalizedType !== 'PHYSICAL') {
      res.status(400).json({ error: 'consultationType must be ONLINE or PHYSICAL' });
      return;
    }

    const capacity = Number(maxBookings ?? 1);
    if (!Number.isFinite(capacity) || capacity < 1 || !Number.isInteger(capacity)) {
      res.status(400).json({ error: 'maxBookings must be a positive integer' });
      return;
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || endMinutes <= startMinutes) {
      res.status(400).json({ error: 'startTime and endTime must be valid and endTime must be later than startTime' });
      return;
    }

    const interval = slotDurationMinutes === undefined || slotDurationMinutes === null
      ? endMinutes - startMinutes
      : Number(slotDurationMinutes);

    if (!Number.isFinite(interval) || interval < 1 || !Number.isInteger(interval)) {
      res.status(400).json({ error: 'slotDurationMinutes must be a positive integer' });
      return;
    }

    if (interval > endMinutes - startMinutes) {
      res.status(400).json({ error: 'slotDurationMinutes cannot exceed the total time range' });
      return;
    }

    const doctor = await ensureDoctorProfile(req);

    const newSlots: DoctorSlot[] = [];
    for (let cursor = startMinutes; cursor + interval <= endMinutes; cursor += interval) {
      const candidateStart = formatMinutesToTime(cursor);
      const candidateEnd = formatMinutesToTime(cursor + interval);

      const duplicateSlot = doctor.availableSlots.find(
        (slot) =>
          slot.date.toISOString().slice(0, 10) === parsedDate.toISOString().slice(0, 10) &&
          slot.startTime === candidateStart &&
          slot.endTime === candidateEnd &&
          (slot.consultationType || 'ONLINE') === normalizedType
      );

      if (duplicateSlot) {
        continue;
      }

      newSlots.push({
        slotId: uuidv4(),
        date: parsedDate,
        startTime: candidateStart,
        endTime: candidateEnd,
        consultationType: normalizedType,
        maxBookings: capacity,
        isBooked: false,
      });
    }

    if (!newSlots.length) {
      res.status(409).json({ error: 'No new slots were created. The range may already exist.' });
      return;
    }

    doctor.availableSlots.push(...newSlots);
    await doctor.save();

    res.status(201).json({
      message: `Created ${newSlots.length} slot${newSlots.length === 1 ? '' : 's'}`,
      slots: newSlots,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add schedule slot' });
  }
}

export async function deleteScheduleSlot(req: Request, res: Response): Promise<void> {
  try {
    const { slotId } = req.params;
    const doctor = await ensureDoctorProfile(req);

    const targetSlot = doctor.availableSlots.find((slot) => slot.slotId === slotId);
    if (!targetSlot) {
      res.status(404).json({ error: 'Slot not found' });
      return;
    }

    const counts = await fetchSlotBookingCounts(doctor.userId, [slotId]);
    const activeBookings = counts.get(slotId) || 0;
    if (activeBookings > 0) {
      res.status(409).json({ error: 'Cannot remove a booked slot' });
      return;
    }

    doctor.availableSlots = doctor.availableSlots.filter((slot) => slot.slotId !== slotId);
    await doctor.save();

    res.status(200).json({ message: 'Slot removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove slot' });
  }
}

export async function createPrescription(req: Request, res: Response): Promise<void> {
  try {
    const { patientId, appointmentId, medications, notes } = req.body as {
      patientId?: string;
      appointmentId?: string;
      medications?: Array<{ name: string; dosage: string; frequency: string }>;
      notes?: string;
    };

    if (!patientId || !appointmentId || !medications || !Array.isArray(medications) || medications.length === 0) {
      res.status(400).json({
        error: 'patientId, appointmentId, and a non-empty medications array are required',
      });
      return;
    }

    const invalidMedication = medications.find(
      (item) => !item?.name || !item?.dosage || !item?.frequency
    );

    if (invalidMedication) {
      res.status(400).json({ error: 'Each medication must include name, dosage, and frequency' });
      return;
    }

    const appointmentServiceUrl = process.env.APPOINTMENT_SERVICE_URL;
    if (!appointmentServiceUrl) {
      res.status(500).json({ error: 'Server misconfiguration: APPOINTMENT_SERVICE_URL is missing' });
      return;
    }

    type AppointmentPayload = {
      id: string;
      patientId: string;
      doctorId: string;
      status: string;
    };

    let appointment: AppointmentPayload;
    try {
      const appointmentResponse = await axios.get<AppointmentPayload>(
        `${appointmentServiceUrl}/api/appointments/${encodeURIComponent(appointmentId)}`,
        {
          headers: {
            Authorization: req.headers.authorization || '',
          },
          timeout: 8000,
        },
      );
      appointment = appointmentResponse.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        res.status(404).json({ error: 'Consultation not found for prescription' });
        return;
      }

      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        res.status(403).json({ error: 'Not authorized to prescribe for this consultation' });
        return;
      }

      res.status(502).json({ error: 'Failed to validate consultation details' });
      return;
    }

    if (appointment.doctorId !== req.user!.userId) {
      res.status(403).json({ error: 'You can only prescribe for your own consultations' });
      return;
    }

    if (appointment.patientId !== patientId) {
      res.status(400).json({ error: 'Selected patient does not match consultation patient' });
      return;
    }

    if (!['IN_PROGRESS', 'COMPLETED'].includes(appointment.status)) {
      res.status(400).json({ error: 'Prescriptions can only be issued for active or completed consultations' });
      return;
    }

    const alreadyIssued = await Prescription.findOne({ appointmentId }).select('_id').lean();
    if (alreadyIssued) {
      res.status(409).json({ error: 'A prescription already exists for this consultation' });
      return;
    }

    let patientName: string | undefined;
    const patientServiceUrl = process.env.PATIENT_SERVICE_URL;
    if (patientServiceUrl) {
      try {
        const patientResponse = await axios.get<{ patient?: { name?: string } }>(
          `${patientServiceUrl}/api/patients/internal/${encodeURIComponent(patientId)}`,
          {
            headers: {
              Authorization: req.headers.authorization || '',
            },
            timeout: 8000,
          },
        );
        const candidateName = patientResponse.data?.patient?.name;
        if (typeof candidateName === 'string' && candidateName.trim()) {
          patientName = candidateName.trim();
        }
      } catch {
        // Non-blocking: prescription creation should not fail due to name lookup issues.
      }
    }

    const prescription = await Prescription.create({
      doctorId: req.user!.userId,
      doctorName: req.user!.name,
      patientId,
      patientName,
      appointmentId,
      medications,
      notes,
      issuedAt: new Date(),
    });

    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create prescription' });
  }
}

export async function getPrescriptions(req: Request, res: Response): Promise<void> {
  try {
    const prescriptions = await Prescription.find({ doctorId: req.user!.userId })
      .sort({ issuedAt: -1 })
      .lean();

    res.status(200).json(prescriptions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
}

export async function getPatientPrescriptionsInternal(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const patientId = req.params.patientId;

    const [prescriptions, total] = await Promise.all([
      Prescription.find({ patientId })
        .sort({ issuedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Prescription.countDocuments({ patientId }),
    ]);

    res.status(200).json({
      prescriptions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient prescriptions' });
  }
}

export async function getPatientReports(req: Request, res: Response): Promise<void> {
  try {
    const { patientId } = req.params;
    const patientServiceUrl = process.env.PATIENT_SERVICE_URL;
    const appointmentServiceUrl = process.env.APPOINTMENT_SERVICE_URL;

    if (!patientServiceUrl) {
      res.status(500).json({ error: 'Server misconfiguration: PATIENT_SERVICE_URL is missing' });
      return;
    }

    if (!appointmentServiceUrl) {
      res.status(500).json({ error: 'Server misconfiguration: APPOINTMENT_SERVICE_URL is missing' });
      return;
    }

    // Doctors can only review reports for patients they actually consult.
    let doctorAppointments: Array<{ patientId?: string; status?: string }> = [];
    try {
      const appointmentsResponse = await axios.get(`${appointmentServiceUrl}/api/appointments`, {
        headers: {
          Authorization: req.headers.authorization || '',
        },
        timeout: 8000,
      });

      const payload = appointmentsResponse.data;
      if (Array.isArray(payload)) {
        doctorAppointments = payload;
      } else if (Array.isArray(payload?.appointments)) {
        doctorAppointments = payload.appointments;
      }
    } catch {
      res.status(502).json({ error: 'Failed to verify doctor-patient appointment relationship' });
      return;
    }

    const hasConsultationRelationship = doctorAppointments.some((appointment) => {
      if (appointment.patientId !== patientId) {
        return false;
      }

      const status = String(appointment.status || '').toUpperCase();
      return status !== 'CANCELLED' && status !== 'REJECTED';
    });

    if (!hasConsultationRelationship) {
      res.status(403).json({
        error: 'You can only access reports for patients with active or completed consultations',
      });
      return;
    }

    const response = await axios.get(`${patientServiceUrl}/api/patients/internal/${patientId}/reports`, {
      headers: {
        Authorization: req.headers.authorization || '',
      },
      timeout: 8000,
    });

    const reports = response.data?.reports;
    res.status(200).json(Array.isArray(reports) ? reports : []);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const statusCode = error.response.status;
      if (statusCode === 404) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      if (statusCode === 401 || statusCode === 403) {
        res.status(403).json({ error: 'Not authorized to access patient reports' });
        return;
      }
    }

    res.status(502).json({ error: 'Failed to fetch patient reports from patient-service' });
  }
}

export async function verifyDoctor(req: Request, res: Response): Promise<void> {
  try {
    const { verified, reason } = req.body as { verified?: boolean; reason?: string };

    if (typeof verified !== 'boolean') {
      res.status(400).json({ error: 'verified must be a boolean' });
      return;
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    doctor.isVerified = verified;
    doctor.verificationReason = reason || undefined;
    await doctor.save();

    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update doctor verification status' });
  }
}

export async function getPendingDoctors(_req: Request, res: Response): Promise<void> {
  try {
    const doctors = await Doctor.find({ isVerified: false })
      .select('name email specialty qualifications isVerified verificationReason')
      .lean();

    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending doctors' });
  }
}
