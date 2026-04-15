import { Document, Schema, model } from 'mongoose';

export type AuditAction =
  | 'auth.register'
  | 'auth.login'
  | 'auth.refresh'
  | 'auth.logout'
  | 'admin.user.verify'
  | 'admin.user.deactivate';

export type AuditOutcome = 'success' | 'failure';

export interface IAuditLog extends Document {
  actorUserId?: string;
  targetUserId?: string;
  action: AuditAction;
  outcome: AuditOutcome;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: {
      type: String,
      trim: true,
    },
    targetUserId: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      enum: [
        'auth.register',
        'auth.login',
        'auth.refresh',
        'auth.logout',
        'admin.user.verify',
        'admin.user.deactivate',
      ],
      required: true,
    },
    outcome: {
      type: String,
      enum: ['success', 'failure'],
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ targetUserId: 1, createdAt: -1 });
auditLogSchema.index({ outcome: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);