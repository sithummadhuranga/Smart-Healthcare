import { Schema, model, Document } from 'mongoose';

// ── Types ──────────────────────────────────────────────────────────────────────
export type UserRole = 'patient' | 'doctor' | 'admin';

export interface IUser extends Document {
  _id: import('mongoose').Types.ObjectId;
  name: string;
  email: string;
  /** NEVER returned in API responses — select: false */
  passwordHash: string;
  role: UserRole;
  /**
   * Patients: auto-true at registration.
   * Doctors: starts false — admin must verify.
   */
  isVerified: boolean;
  /** Soft-delete flag — deactivated accounts cannot login */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
      /**
       * SECURITY: select:false ensures this field is NEVER included
       * in query results unless explicitly requested with .select('+passwordHash').
       * This prevents accidental exposure in list endpoints.
       */
      select: false,
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      required: true,
    },
    isVerified: {
      type: Boolean,
      /**
       * Patients are verified immediately (no admin approval needed).
       * Doctors require admin to call PATCH /api/auth/users/:id/verify.
       * Use a default function to access `this.role` at creation time.
       */
      default: function (this: IUser) {
        return this.role === 'patient' || this.role === 'admin';
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // auto-manages createdAt + updatedAt

    toJSON: {
      /**
       * Transform: strip passwordHash from all JSON serialisation.
       * Belt-and-suspenders alongside select:false.
       */
      transform(_doc, ret) {
        const sanitized = ret as Record<string, unknown>;
        delete sanitized['passwordHash'];
        delete sanitized['__v'];
        return sanitized;
      },
    },

    toObject: {
      transform(_doc, ret) {
        const sanitized = ret as Record<string, unknown>;
        delete sanitized['passwordHash'];
        delete sanitized['__v'];
        return sanitized;
      },
    },
  },
);

// ── Indexes ────────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });    // fast lookup by email
userSchema.index({ role: 1, isVerified: 1 });        // admin queries by role+verified
userSchema.index({ createdAt: -1 });                 // list endpoints sort by newest

// ── Model ──────────────────────────────────────────────────────────────────────
export const User = model<IUser>('User', userSchema);
