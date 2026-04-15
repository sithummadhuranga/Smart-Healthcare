import { Request } from 'express';
import { AuditLog, AuditAction, AuditOutcome } from '../models/AuditLog';
import logger from '../logger';

interface RecordAuditEventInput {
  actorUserId?: string;
  targetUserId?: string;
  action: AuditAction;
  outcome: AuditOutcome;
  email?: string;
  metadata?: Record<string, unknown>;
}

function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.header('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }

  return req.ip || req.socket.remoteAddress || undefined;
}

export async function recordAuditEvent(
  req: Request,
  input: RecordAuditEventInput,
): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    await AuditLog.create({
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      action: input.action,
      outcome: input.outcome,
      email: input.email?.toLowerCase().trim(),
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent') || undefined,
      metadata: input.metadata,
    });
  } catch (error) {
    logger.warn(`audit log write failed: ${(error as Error).message}`);
  }
}