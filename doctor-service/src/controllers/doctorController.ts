import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Doctor } from '../models/Doctor';
import { Prescription } from '../models/Prescription';

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
      .select('name specialty bio consultationFee isVerified availableSlots')
      .lean();

    res.status(200).json(doctors);
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

    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
}

export async function getDoctorByUserIdInternal(req: Request, res: Response): Promise<void> {
  try {
    const doctor = await Doctor.findOne({ userId: req.params.userId })
      .select('userId name specialty bio consultationFee isVerified availableSlots')
      .lean();

    if (!doctor || !doctor.isVerified) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
}

export async function getDoctorProfile(req: Request, res: Response): Promise<void> {
  try {
    const doctor = await ensureDoctorProfile(req);
    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor profile' });
  }
}

export async function updateDoctorProfile(req: Request, res: Response): Promise<void> {
  try {
    const { specialty, bio, consultationFee, qualifications } = req.body as {
      specialty?: string;
      bio?: string;
      consultationFee?: number;
      qualifications?: string[];
    };

    if (
      specialty === undefined &&
      bio === undefined &&
      consultationFee === undefined &&
      qualifications === undefined
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

    await doctor.save();

    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update doctor profile' });
  }
}

export async function getSchedule(req: Request, res: Response): Promise<void> {
  try {
    const doctor = await ensureDoctorProfile(req);
    res.status(200).json(doctor.availableSlots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
}

export async function addScheduleSlot(req: Request, res: Response): Promise<void> {
  try {
    const { date, startTime, endTime } = req.body as {
      date?: string;
      startTime?: string;
      endTime?: string;
    };

    if (!date || !startTime || !endTime) {
      res.status(400).json({ error: 'date, startTime, and endTime are required' });
      return;
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }

    const doctor = await ensureDoctorProfile(req);

    const duplicateSlot = doctor.availableSlots.find(
      (slot) =>
        slot.date.toISOString().slice(0, 10) === parsedDate.toISOString().slice(0, 10) &&
        slot.startTime === startTime &&
        slot.endTime === endTime
    );

    if (duplicateSlot) {
      res.status(409).json({ error: 'An identical slot already exists' });
      return;
    }

    const slot = {
      slotId: uuidv4(),
      date: parsedDate,
      startTime,
      endTime,
      isBooked: false,
    };

    doctor.availableSlots.push(slot);
    await doctor.save();

    res.status(201).json(slot);
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

    if (targetSlot.isBooked) {
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

    const prescription = await Prescription.create({
      doctorId: req.user!.userId,
      doctorName: req.user!.name,
      patientId,
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

    if (!patientServiceUrl) {
      res.status(500).json({ error: 'Server misconfiguration: PATIENT_SERVICE_URL is missing' });
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
