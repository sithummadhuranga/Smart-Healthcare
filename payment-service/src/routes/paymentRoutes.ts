// FILE: src/routes/paymentRoutes.ts
import { Router } from 'express';
import { createPaymentIntent, getAllPayments, getPaymentByAppointment } from '../controllers/paymentController';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.post('/intent', authenticate, requireRole('patient'), createPaymentIntent);
router.get('/admin/all', authenticate, requireRole('admin'), getAllPayments);
router.get('/:appointmentId', authenticate, requireRole('patient', 'admin'), getPaymentByAppointment);

export default router;