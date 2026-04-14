import { Request, Response } from 'express';
import { Patient } from '../models/Patient';
import { MedicalReport } from '../models/MedicalReport';
import { uploadToCloudinary } from '../config/cloudinary';
import logger from '../logger';

// ── GET /api/patients/profile ─────────────────────────────────────────────────

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    let patient = await Patient.findOne({ userId });
    if (!patient) {
      // Build a safe fallback name when gateway-forwarded name is unavailable.
      const fallbackName = req.user!.email?.split('@')[0] || 'Patient';

      // Auto-create profile on first access (patient was registered in Auth Service)
      patient = await Patient.create({
        userId,
        name: req.user!.name || fallbackName,
        email: req.user!.email,
      });
    }

    res.status(200).json({ patient });
  } catch (err) {
    logger.error(`getProfile error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── PUT /api/patients/profile ─────────────────────────────────────────────────

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    // Whitelist updatable fields — prevent mass-assignment attacks
    const {
      name,
      dateOfBirth,
      gender,
      phone,
      address,
      bloodGroup,
      allergies,
      chronicConditions,
      emergencyContact,
    } = req.body as {
      name?: string;
      dateOfBirth?: string;
      gender?: string;
      phone?: string;
      address?: object;
      bloodGroup?: string;
      allergies?: string[];
      chronicConditions?: string[];
      emergencyContact?: object;
    };

    const allowedGenders = ['male', 'female', 'other'];
    const allowedBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    if (gender && !allowedGenders.includes(gender)) {
      res.status(400).json({ error: `gender must be one of: ${allowedGenders.join(', ')}` });
      return;
    }
    if (bloodGroup && !allowedBloodGroups.includes(bloodGroup)) {
      res.status(400).json({
        error: `bloodGroup must be one of: ${allowedBloodGroups.join(', ')}`,
      });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates['name'] = name.trim();
    if (dateOfBirth !== undefined) updates['dateOfBirth'] = new Date(dateOfBirth);
    if (gender !== undefined) updates['gender'] = gender;
    if (phone !== undefined) updates['phone'] = phone.trim();
    if (address !== undefined) updates['address'] = address;
    if (bloodGroup !== undefined) updates['bloodGroup'] = bloodGroup;
    if (allergies !== undefined) updates['allergies'] = allergies;
    if (chronicConditions !== undefined) updates['chronicConditions'] = chronicConditions;
    if (emergencyContact !== undefined) updates['emergencyContact'] = emergencyContact;

    const patient = await Patient.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json({ patient, message: 'Profile updated successfully' });
  } catch (err) {
    logger.error(`updateProfile error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── POST /api/patients/reports ─────────────────────────────────────────────────

export async function uploadReport(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { title, description, reportType } = req.body as {
      title?: string;
      description?: string;
      reportType?: string;
    };

    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const allowedTypes = ['lab', 'imaging', 'prescription', 'discharge', 'other'];
    if (!reportType || !allowedTypes.includes(reportType)) {
      res.status(400).json({
        error: `reportType must be one of: ${allowedTypes.join(', ')}`,
      });
      return;
    }

    // Find the patient record
    let patient = await Patient.findOne({ userId });
    if (!patient) {
      patient = await Patient.create({
        userId,
        name: req.user!.name,
        email: req.user!.email,
      });
    }

    // Upload to Cloudinary
    const { url, publicId, format, bytes } = await uploadToCloudinary(
      req.file.buffer,
      patient._id.toString(),
      req.file.originalname,
      req.file.mimetype,
    );

    // Save report metadata
    const report = await MedicalReport.create({
      patientId: patient._id.toString(),
      uploadedBy: userId,
      title: title.trim(),
      description: description?.trim(),
      reportType,
      fileUrl: url,
      publicId,
      format,
      bytes,
    });

    logger.info(`Report uploaded: ${report._id} for patient ${patient._id}`);
    res.status(201).json({ report, message: 'Report uploaded successfully' });
  } catch (err) {
    logger.error(`uploadReport error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── GET /api/patients/reports ──────────────────────────────────────────────────

export async function getReports(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 10));
    const typeFilter = req.query['type'] as string | undefined;

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(200).json({ reports: [], pagination: { page, limit, total: 0, pages: 0 } });
      return;
    }

    const filter: Record<string, unknown> = { patientId: patient._id.toString() };
    if (typeFilter) filter['reportType'] = typeFilter;

    const [reports, total] = await Promise.all([
      MedicalReport.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      MedicalReport.countDocuments(filter),
    ]);

    res.status(200).json({
      reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error(`getReports error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── GET /api/patients/prescriptions ───────────────────────────────────────────

export async function getPrescriptions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 10));

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(200).json({
        prescriptions: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
      return;
    }

    // Prescriptions are medical reports with type 'prescription'
    const filter = { patientId: patient._id.toString(), reportType: 'prescription' };

    const [prescriptions, total] = await Promise.all([
      MedicalReport.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      MedicalReport.countDocuments(filter),
    ]);

    res.status(200).json({
      prescriptions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error(`getPrescriptions error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── GET /api/patients/history ──────────────────────────────────────────────────

export async function getMedicalHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(200).json({ history: [] });
      return;
    }

    // Return all report types grouped by type for a complete medical history
    const reports = await MedicalReport.find({ patientId: patient._id.toString() })
      .sort({ createdAt: -1 })
      .limit(100);

    const history = reports.reduce(
      (acc, report) => {
        const type = report.reportType;
        if (!acc[type]) acc[type] = [];
        acc[type].push(report);
        return acc;
      },
      {} as Record<string, typeof reports>,
    );

    res.status(200).json({ patient, history });
  } catch (err) {
    logger.error(`getMedicalHistory error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── GET /api/patients/:id — admin only ────────────────────────────────────────

export async function getPatientById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const reports = await MedicalReport.find({ patientId: id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ patient, reports });
  } catch (err) {
    logger.error(`getPatientById error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── GET /api/patients — admin only (paginated) ────────────────────────────────

export async function listPatients(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const search = req.query['search'] as string | undefined;

    const filter: Record<string, unknown> = {};
    if (search) {
      filter['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Patient.countDocuments(filter),
    ]);

    res.status(200).json({
      patients,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error(`listPatients error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Internal: GET /api/patients/internal/:userId — called by Doctor Service ──

export async function getPatientByUserId(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.status(200).json({ patient });
  } catch (err) {
    logger.error(`getPatientByUserId error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Internal: GET /api/patients/internal/:userId/reports — for Doctor Service ─

export async function getPatientReportsByUserId(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const reports = await MedicalReport.find({ patientId: patient._id.toString() })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ reports });
  } catch (err) {
    logger.error(`getPatientReportsByUserId error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}
