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
  endedAt?: string;
  duration?: string;
}

const sessions = new Map<string, SessionState>();

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

    const authHeader = req.headers.authorization as string;
    const appointment = await getAppointmentById(appointmentId, authHeader);

    if (!hasAppointmentAccess(req.user!.userId, req.user!.role, appointment)) {
      res.status(403).json({ error: 'You are not allowed to join this appointment' });
      return;
    }

    if (appointment.status === 'CANCELLED' || appointment.status === 'REJECTED') {
      res.status(403).json({ error: `Cannot join a ${appointment.status} appointment` });
      return;
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

    const authHeader = req.headers.authorization as string;
    const appointment = await getAppointmentById(appointmentId, authHeader);

    if (appointment.doctorId !== req.user!.userId) {
      res.status(403).json({ error: 'Only the assigned doctor can start this session' });
      return;
    }

    await markAppointmentInProgress(appointmentId);

    const startedAt = new Date().toISOString();
    sessions.set(appointmentId, {
      appointmentId,
      channelName: appointmentId,
      status: 'IN_PROGRESS',
      startedAt,
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

    const authHeader = req.headers.authorization as string;
    const appointment = await getAppointmentById(appointmentId, authHeader);

    if (appointment.doctorId !== req.user!.userId) {
      res.status(403).json({ error: 'Only the assigned doctor can end this session' });
      return;
    }

    await completeAppointmentAsDoctor(appointmentId, authHeader);

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

    try {
      await publishNotificationEvent({
        event: 'consultation.completed',
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
      });
    } catch (publishError) {
      console.error('[telemedicine-service] Failed to publish consultation.completed', publishError);
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
    const authHeader = req.headers.authorization as string;

    const appointment = await getAppointmentById(appointmentId, authHeader);
    if (!hasAppointmentAccess(req.user!.userId, req.user!.role, appointment)) {
      res.status(403).json({ error: 'You are not allowed to access this appointment' });
      return;
    }

    const session = sessions.get(appointmentId);

    if (!session) {
      res.status(200).json({
        channelName: appointmentId,
        status: appointment.status,
        duration: null,
      });
      return;
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
