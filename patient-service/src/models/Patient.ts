import { Schema, model, Document } from 'mongoose';

export interface IPatient extends Document {
  _id: import('mongoose').Types.ObjectId;
  userId: string;      // Auth Service user ID (foreign key reference)
  name: string;
  email: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    district?: string;
    country?: string;
  };
  bloodGroup?: string;
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    phone: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      district: String,
      country: { type: String, default: 'Sri Lanka' },
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    allergies: [{ type: String }],
    chronicConditions: [{ type: String }],
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
  },
  { timestamps: true },
);

export const Patient = model<IPatient>('Patient', patientSchema);
