import { Router } from 'express';
import {
  addScheduleSlot,
  createPrescription,
  deleteScheduleSlot,
  getDoctorById,
  getDoctorByUserIdInternal,
  getDoctorProfile,
  getDoctors,
  getPatientPrescriptionsInternal,
  getPatientReports,
  getPendingDoctors,
  getPrescriptions,
  getSchedule,
  updateDoctorProfile,
  verifyDoctor,
} from '../controllers/doctorController';
import { requireRole, verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getDoctors);
router.get('/pending', verifyToken, requireRole('admin'), getPendingDoctors);
router.get('/profile', verifyToken, requireRole('doctor'), getDoctorProfile);
router.put('/profile', verifyToken, requireRole('doctor'), updateDoctorProfile);
router.get('/schedule', verifyToken, requireRole('doctor'), getSchedule);
router.post('/schedule', verifyToken, requireRole('doctor'), addScheduleSlot);
router.delete('/schedule/:slotId', verifyToken, requireRole('doctor'), deleteScheduleSlot);
router.post('/prescriptions', verifyToken, requireRole('doctor'), createPrescription);
router.get('/prescriptions', verifyToken, requireRole('doctor'), getPrescriptions);
router.get('/patients/:patientId/reports', verifyToken, requireRole('doctor'), getPatientReports);
router.patch('/:id/verify', verifyToken, requireRole('admin'), verifyDoctor);
router.get('/internal/user/:userId', getDoctorByUserIdInternal);
router.get('/internal/patients/:patientId/prescriptions', getPatientPrescriptionsInternal);
router.get('/:id', getDoctorById);

export default router;
