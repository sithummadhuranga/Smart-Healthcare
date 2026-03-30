import { Schema, model, Document } from 'mongoose';

export type ReportType = 'lab' | 'imaging' | 'prescription' | 'discharge' | 'other';

export interface IMedicalReport extends Document {
  // _id is ObjectId from Mongoose — use .toString() when needed
  patientId: string;    // Patient._id
  uploadedBy: string;   // Auth userId
  title: string;
  description?: string;
  reportType: ReportType;
  fileUrl: string;      // Cloudinary secure_url
  publicId: string;     // Cloudinary public_id (for deletion)
  format: string;       // e.g., 'pdf', 'jpg', 'png'
  bytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const medicalReportSchema = new Schema<IMedicalReport>(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    reportType: {
      type: String,
      enum: ['lab', 'imaging', 'prescription', 'discharge', 'other'],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    format: { type: String },
    bytes: { type: Number },
  },
  { timestamps: true },
);

medicalReportSchema.index({ patientId: 1, createdAt: -1 });

export const MedicalReport = model<IMedicalReport>('MedicalReport', medicalReportSchema);
