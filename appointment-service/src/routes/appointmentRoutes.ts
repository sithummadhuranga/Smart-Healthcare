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
  getSlotBookingCountsInternal,
  markAppointmentPaid,
  markPrescriptionIssued,
  rejectAppointment,
  startAppointment,
  startAppointmentByDoctor,
} from '../controllers/appointmentController';
import {
  requireInternalApiKey,
  requireRole,
  verifyToken,
} from '../middleware/authMiddleware';

const router = Router();

router.get('/', verifyToken, requireRole('patient', 'doctor', 'admin'), getAppointments);
router.get('/admin/all', verifyToken, requireRole('admin'), getAllAppointmentsAdmin);
router.get('/:id', verifyToken, requireRole('patient', 'doctor', 'admin'), getAppointmentById);
router.post('/', verifyToken, requireRole('patient', 'admin'), createAppointment);
router.patch('/:id/modify', verifyToken, requireRole('patient', 'admin'), modifyAppointment);
router.patch('/:id/cancel', verifyToken, requireRole('patient', 'admin'), cancelAppointment);
router.patch('/:id/accept', verifyToken, requireRole('doctor', 'admin'), acceptAppointment);
router.patch('/:id/reject', verifyToken, requireRole('doctor', 'admin'), rejectAppointment);
router.patch('/:id/complete', verifyToken, requireRole('doctor', 'admin'), completeAppointment);
router.patch('/:id/start-visit', verifyToken, requireRole('doctor', 'admin'), startAppointmentByDoctor);

router.patch('/:id/pay', requireInternalApiKey, markAppointmentPaid);
router.patch('/:id/start', requireInternalApiKey, startAppointment);
router.post('/:id/prescription-issued', requireInternalApiKey, markPrescriptionIssued);
router.post('/internal/slot-bookings', getSlotBookingCountsInternal);

export default router;
