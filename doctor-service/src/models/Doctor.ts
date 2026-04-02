import { Schema, model, Document } from 'mongoose';

export interface DoctorSlot {
  slotId: string;
  date: Date;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface DoctorDocument extends Document {
  userId: string;
  name: string;
  email: string;
  specialty?: string;
  bio?: string;
  qualifications: string[];
  consultationFee?: number;
  isVerified: boolean;
  verificationReason?: string;
  availableSlots: DoctorSlot[];
  createdAt: Date;
  updatedAt: Date;
}

const SlotSchema = new Schema<DoctorSlot>(
  {
    slotId: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isBooked: { type: Boolean, default: false },
  },
  { _id: false }
);

const DoctorSchema = new Schema<DoctorDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    specialty: { type: String },
    bio: { type: String },
    qualifications: { type: [String], default: [] },
    consultationFee: { type: Number },
    isVerified: { type: Boolean, default: false },
    verificationReason: { type: String },
    availableSlots: { type: [SlotSchema], default: [] },
  },
  { timestamps: true }
);

export const Doctor = model<DoctorDocument>('Doctor', DoctorSchema);
