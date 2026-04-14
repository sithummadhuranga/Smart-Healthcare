import { Router } from 'express';
import {
  acceptAppointment,
  cancelAppointment,
  completeAppointment,
  createAppointment,
  modifyAppointment,
  getAllAppointmentsAdmin,
  getAppointmentById,
  getAppointments,
  markAppointmentPaid,
  markPrescriptionIssued,
  rejectAppointment,
  startAppointment,
} from '../controllers/appointmentController';
import {
  requireInternalApiKey,
  requireRole,
  verifyToken,
} from '../middleware/authMiddleware';

const router = Router();

router.get('/', verifyToken, requireRole('patient', 'doctor'), getAppointments);
router.get('/admin/all', verifyToken, requireRole('admin'), getAllAppointmentsAdmin);
router.get('/:id', verifyToken, requireRole('patient', 'doctor', 'admin'), getAppointmentById);
router.post('/', verifyToken, requireRole('patient'), createAppointment);
router.patch('/:id/modify', verifyToken, requireRole('patient'), modifyAppointment);
router.patch('/:id/cancel', verifyToken, requireRole('patient'), cancelAppointment);
router.patch('/:id/accept', verifyToken, requireRole('doctor'), acceptAppointment);
router.patch('/:id/reject', verifyToken, requireRole('doctor'), rejectAppointment);
router.patch('/:id/complete', verifyToken, requireRole('doctor'), completeAppointment);

router.patch('/:id/pay', requireInternalApiKey, markAppointmentPaid);
router.patch('/:id/start', requireInternalApiKey, startAppointment);
router.post('/:id/prescription-issued', requireInternalApiKey, markPrescriptionIssued);

export default router;
