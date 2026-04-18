import { Router, Request, Response } from 'express';
import {
  getProfile,
  updateProfile,
  uploadReport,
  getReports,
  getPrescriptions,
  getMedicalHistory,
  getPatientById,
  listPatients,
  getPatientByUserId,
  getPatientReportsByUserId,
} from '../controllers/patientController';
import { verifyToken, requireRole } from '../middleware/verifyToken';
import { upload } from '../config/cloudinary';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'patient-service', scope: 'api/patients' });
});
// ── Patient self-service routes ───────────────────────────────────────────────

/**
 * @openapi
 * /api/patients/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get own patient profile
 *     description: Returns the authenticated patient's profile. Creates one automatically on first request.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Patient profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientProfile'
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Not a patient
 */
router.get('/profile',        verifyToken, requireRole('patient'), getProfile);

/**
 * @openapi
 * /api/patients/profile:
 *   put:
 *     tags: [Profile]
 *     summary: Update own patient profile
 *     description: Updates editable fields of the authenticated patient's profile.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientProfile'
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Not a patient
 */
router.put('/profile',        verifyToken, requireRole('patient'), updateProfile);

/**
 * @openapi
 * /api/patients/reports:
 *   post:
 *     tags: [Reports]
 *     summary: Upload a medical report
 *     description: Uploads a PDF or image medical report to Cloudinary and records metadata.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, title]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF or image file (max 10MB)
 *               title:
 *                 type: string
 *                 example: Blood Test Results
 *               description:
 *                 type: string
 *                 example: Results from 2026-01-15 lab visit
 *     responses:
 *       201:
 *         description: Report uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalReport'
 *       400:
 *         description: No file or missing title
 *       401:
 *         description: Unauthenticated
 */
router.post('/reports',       verifyToken, requireRole('patient'), upload.single('file'), uploadReport);

/**
 * @openapi
 * /api/patients/reports:
 *   get:
 *     tags: [Reports]
 *     summary: List own medical reports
 *     description: Returns all medical reports uploaded by the authenticated patient.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of reports
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MedicalReport'
 *       401:
 *         description: Unauthenticated
 */
router.get('/reports',        verifyToken, requireRole('patient'), getReports);

/**
 * @openapi
 * /api/patients/prescriptions:
 *   get:
 *     tags: [Prescriptions]
 *     summary: List own prescriptions
 *     description: Returns all prescriptions issued to the authenticated patient by doctors.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of prescriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Prescription'
 *       401:
 *         description: Unauthenticated
 */
router.get('/prescriptions',  verifyToken, requireRole('patient'), getPrescriptions);

/**
 * @openapi
 * /api/patients/history:
 *   get:
 *     tags: [Profile]
 *     summary: Get medical history summary
 *     description: Returns an aggregated medical history timeline for the patient.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Medical history entries
 *       401:
 *         description: Unauthenticated
 */
router.get('/history',        verifyToken, requireRole('patient'), getMedicalHistory);
router.get('/hostory',        verifyToken, requireRole('patient'), getMedicalHistory);

// ── Admin routes ──────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/patients:
 *   get:
 *     tags: [Admin]
 *     summary: List all patients (admin only)
 *     description: Returns a list of all registered patient profiles.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Patient list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PatientProfile'
 *                 total:
 *                   type: integer
 *       403:
 *         description: Not admin
 */
router.get('/',    verifyToken, requireRole('admin'), listPatients);

/**
 * @openapi
 * /api/patients/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get patient by MongoDB ID (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Patient profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientProfile'
 *       404:
 *         description: Patient not found
 *       403:
 *         description: Not admin
 */
router.get('/:id', verifyToken, requireRole('admin'), getPatientById);

/**
 * @openapi
 * /api/patients/internal/{userId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get patient by userId (internal service-to-service)
 *     description: >
 *       Internal endpoint used by other microservices (e.g. appointment-service) to look up
 *       a patient profile by auth userId. The API Gateway blocks external access to this path.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Auth service userId
 *     responses:
 *       200:
 *         description: Patient profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientProfile'
 *       404:
 *         description: Patient not found
 */
router.get('/internal/:userId', getPatientByUserId);
router.get('/internal/:userId/reports', getPatientReportsByUserId);

export default router;
