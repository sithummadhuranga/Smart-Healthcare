// FILE: src/routes/paymentRoutes.ts
import { Router, Request, Response } from 'express';
import { createPaymentIntent, getAllPayments, getPaymentByAppointment } from '../controllers/paymentController';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
	res.status(200).json({ status: 'ok', service: 'payment-service', scope: 'api/payments' });
});

router.post('/intent', authenticate, requireRole('patient'), createPaymentIntent);
router.get('/admin/all', authenticate, requireRole('admin'), getAllPayments);
router.get('/:appointmentId', authenticate, requireRole('patient', 'admin'), getPaymentByAppointment);

export default router;