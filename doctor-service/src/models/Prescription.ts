import { Schema, model, Document } from 'mongoose';

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
}

export interface PrescriptionDocument extends Document {
  doctorId: string;
  patientId: string;
  appointmentId: string;
  medications: PrescriptionMedication[];
  notes?: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema = new Schema<PrescriptionMedication>(
  {
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<PrescriptionDocument>(
  {
    doctorId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    appointmentId: { type: String, required: true, index: true },
    medications: { type: [MedicationSchema], required: true },
    notes: { type: String },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Prescription = model<PrescriptionDocument>('Prescription', PrescriptionSchema);
