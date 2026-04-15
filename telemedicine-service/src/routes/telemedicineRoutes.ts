import { Router } from 'express';
import {
  endSession,
  generateTelemedicineToken,
  getSessionInfo,
  startSession,
} from '../controllers/telemedicineController';
import { requireRole, verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/token', verifyToken, requireRole('patient', 'doctor', 'admin'), generateTelemedicineToken);
router.post('/start', verifyToken, requireRole('doctor', 'admin'), startSession);
router.post('/end', verifyToken, requireRole('doctor', 'admin'), endSession);
router.get('/:appointmentId', verifyToken, requireRole('patient', 'doctor', 'admin'), getSessionInfo);

export default router;
