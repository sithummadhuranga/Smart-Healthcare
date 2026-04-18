import { Request, Response } from 'express';
import axios from 'axios';
import { buildAgoraToken } from '../services/agoraTokenService';
import {
  completeAppointmentAsDoctor,
  getAppointmentById,
  markAppointmentInProgress,
} from '../services/appointmentService';
import { publishNotificationEvent } from '../services/rabbitmqPublisher';

interface SessionState {
  appointmentId: string;
  channelName: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string;
  doctorId?: string;
  patientId?: string;
  endedAt?: string;
  duration?: string;
}

const sessions = new Map<string, SessionState>();

function isStandaloneMode(): boolean {
  return String(process.env.TELEMEDICINE_STANDALONE_MODE || '').toLowerCase() === 'true';
}

function handleAppointmentDependencyError(error: unknown, res: Response, defaultMessage: string): void {
  if (!axios.isAxiosError(error)) {
    res.status(500).json({ error: defaultMessage });
    return;
  }

  if (error.response?.status === 404) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  if (error.response?.status === 403) {
    res.status(403).json({ error: 'You are not allowed to access this appointment' });
    return;
  }

  if (error.response?.status === 401) {
    res.status(401).json({ error: 'Invalid token for appointment access' });
    return;
  }

  if (error.response?.status === 400) {
    res.status(400).json({ error: 'Appointment is not in a valid state for this operation' });
    return;
  }

  if (error.code === 'ECONNABORTED') {
    res.status(504).json({ error: 'Appointment service timeout' });
    return;
  }

  res.status(502).json({ error: 'Appointment service is unavailable' });
}

function durationFrom(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const diffSeconds = Math.max(0, Math.floor((end - start) / 1000));

  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function hasAppointmentAccess(
  userId: string,
  role: string,
  appointment: { patientId: string; doctorId: string }
): boolean {
  if (role === 'admin') {
    return true;
  }

  return appointment.patientId === userId || appointment.doctorId === userId;
}

export async function generateTelemedicineToken(req: Request, res: Response): Promise<void> {
  try {
    const { appointmentId } = req.body as { appointmentId?: string };
    if (!appointmentId) {
      res.status(400).json({ error: 'appointmentId is required' });
      return;
    }

    if (!isStandaloneMode()) {
      const authHeader = req.headers.authorization as string;
      const appointment = await getAppointmentById(appointmentId, authHeader);

      if (!hasAppointmentAccess(req.user!.userId, req.user!.role, appointment)) {
        res.status(403).json({ error: 'You are not allowed to join this appointment' });
        return;
      }

      if (appointment.consultationType === 'PHYSICAL') {
        res.status(403).json({ error: 'Telemedicine is only available for online appointments' });
        return;
      }

      if (appointment.status === 'CANCELLED' || appointment.status === 'REJECTED') {
        res.status(403).json({ error: `Cannot join a ${appointment.status} appointment` });
        return;
      }
    } else {
      const session = sessions.get(appointmentId);
      if (!session || session.status !== 'IN_PROGRESS') {
        res.status(403).json({ error: 'Session is not active yet' });
        return;
      }

      if (req.user!.role === 'doctor') {
        if (session.doctorId !== req.user!.userId) {
          res.status(403).json({ error: 'Only the host doctor can join this session as doctor' });
          return;
        }
      }

      if (req.user!.role === 'patient') {
        if (!session.patientId) {
          session.patientId = req.user!.userId;
          sessions.set(appointmentId, session);
        } else if (session.patientId !== req.user!.userId) {
          res.status(403).json({ error: 'This session is already assigned to another patient' });
          return;
        }
      }
    }

    const agoraToken = buildAgoraToken(appointmentId, req.user!.userId);
    res.status(200).json({
      token: agoraToken.token,
      channelName: agoraToken.channelName,
      uid: agoraToken.uid,
      appId: agoraToken.appId,
      expiresAt: agoraToken.expiresAt,
    });
  } catch (error) {
    handleAppointmentDependencyError(error, res, 'Failed to generate telemedicine token');
  }
}

export async function startSession(req: Request, res: Response): Promise<void> {
  try {
    const { appointmentId } = req.body as { appointmentId?: string };
    if (!appointmentId) {
      res.status(400).json({ error: 'appointmentId is required' });
      return;
    }

    if (!isStandaloneMode()) {
      const authHeader = req.headers.authorization as string;
      const appointment = await getAppointmentById(appointmentId, authHeader);

      if (appointment.doctorId !== req.user!.userId) {
        res.status(403).json({ error: 'Only the assigned doctor can start this session' });
        return;
      }

      if (appointment.consultationType === 'PHYSICAL') {
        res.status(403).json({ error: 'Physical appointments cannot start a telemedicine session' });
        return;
      }

      await markAppointmentInProgress(appointmentId);
    } else {
      const existing = sessions.get(appointmentId);
      if (existing && existing.status === 'IN_PROGRESS') {
        res.status(409).json({ error: 'Session is already in progress' });
        return;
      }
    }

    const startedAt = new Date().toISOString();
    sessions.set(appointmentId, {
      appointmentId,
      channelName: appointmentId,
      status: 'IN_PROGRESS',
      startedAt,
      doctorId: req.user!.userId,
    });

    res.status(200).json({
      sessionId: appointmentId,
      startedAt,
    });
  } catch (error) {
    handleAppointmentDependencyError(error, res, 'Failed to start telemedicine session');
  }
}

export async function endSession(req: Request, res: Response): Promise<void> {
  try {
    const { appointmentId } = req.body as { appointmentId?: string };
    if (!appointmentId) {
      res.status(400).json({ error: 'appointmentId is required' });
      return;
    }

    let eventPayload: { patientId?: string; doctorId?: string } = {};
    if (!isStandaloneMode()) {
      const authHeader = req.headers.authorization as string;
      const appointment = await getAppointmentById(appointmentId, authHeader);

      if (appointment.doctorId !== req.user!.userId) {
        res.status(403).json({ error: 'Only the assigned doctor can end this session' });
        return;
      }

      if (appointment.consultationType === 'PHYSICAL') {
        res.status(403).json({ error: 'Physical appointments do not have a telemedicine session' });
        return;
      }

      await completeAppointmentAsDoctor(appointmentId, authHeader);
      eventPayload = { patientId: appointment.patientId, doctorId: appointment.doctorId };
    } else {
      const existing = sessions.get(appointmentId);
      if (!existing || existing.status !== 'IN_PROGRESS') {
        res.status(400).json({ error: 'Session is not in progress' });
        return;
      }

      if (existing.doctorId !== req.user!.userId) {
        res.status(403).json({ error: 'Only the host doctor can end this session' });
        return;
      }

      eventPayload = { patientId: existing.patientId, doctorId: existing.doctorId };
    }

    const existingSession = sessions.get(appointmentId);
    const startedAt = existingSession?.startedAt || new Date().toISOString();
    const endedAt = new Date().toISOString();
    const duration = durationFrom(startedAt, endedAt);

    sessions.set(appointmentId, {
      appointmentId,
      channelName: appointmentId,
      status: 'COMPLETED',
      startedAt,
      endedAt,
      duration,
    });

    if (isStandaloneMode()) {
      try {
        await publishNotificationEvent({
          event: 'consultation.completed',
          appointmentId,
          patientId: eventPayload.patientId,
          doctorId: eventPayload.doctorId,
        });
      } catch (publishError) {
        console.error('[telemedicine-service] Failed to publish consultation.completed', publishError);
      }
    }

    res.status(200).json({
      endedAt,
      duration,
    });
  } catch (error) {
    handleAppointmentDependencyError(error, res, 'Failed to end telemedicine session');
  }
}

export async function getSessionInfo(req: Request, res: Response): Promise<void> {
  try {
    const appointmentId = req.params.appointmentId;
    let appointmentStatus: string | null = null;

    if (!isStandaloneMode()) {
      const authHeader = req.headers.authorization as string;
      const appointment = await getAppointmentById(appointmentId, authHeader);
      if (!hasAppointmentAccess(req.user!.userId, req.user!.role, appointment)) {
        res.status(403).json({ error: 'You are not allowed to access this appointment' });
        return;
      }

      if (appointment.consultationType === 'PHYSICAL') {
        res.status(403).json({ error: 'Physical appointments do not have telemedicine session details' });
        return;
      }

      appointmentStatus = appointment.status;
    }

    const session = sessions.get(appointmentId);

    if (!session) {
      if (isStandaloneMode()) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.status(200).json({
        channelName: appointmentId,
        status: appointmentStatus,
        duration: null,
      });
      return;
    }

    if (isStandaloneMode()) {
      if (req.user!.role === 'doctor' && session.doctorId !== req.user!.userId) {
        res.status(403).json({ error: 'You are not allowed to access this session' });
        return;
      }

      if (req.user!.role === 'patient' && session.patientId && session.patientId !== req.user!.userId) {
        res.status(403).json({ error: 'You are not allowed to access this session' });
        return;
      }
    }

    res.status(200).json({
      channelName: session.channelName,
      status: session.status,
      duration: session.duration || null,
    });
  } catch (error) {
    handleAppointmentDependencyError(error, res, 'Failed to fetch session information');
  }
}
