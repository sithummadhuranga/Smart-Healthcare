import { Router } from 'express';
import {
  endSession,
  generateTelemedicineToken,
  getSessionInfo,
  startSession,
} from '../controllers/telemedicineController';
import { requireRole, verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/token', verifyToken, requireRole('patient', 'doctor'), generateTelemedicineToken);
router.post('/start', verifyToken, requireRole('doctor'), startSession);
router.post('/end', verifyToken, requireRole('doctor'), endSession);
router.get('/:appointmentId', verifyToken, requireRole('patient', 'doctor'), getSessionInfo);

export default router;
