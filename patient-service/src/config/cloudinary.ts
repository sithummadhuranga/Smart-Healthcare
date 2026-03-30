import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Request } from 'express';
import logger from '../logger';

// Configure Cloudinary from environment
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Allowed MIME types for medical document uploads
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Use memoryStorage so we can stream to Cloudinary
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req: Request, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type not allowed. Allowed types: PDF, JPEG, PNG, WEBP (max ${MAX_FILE_SIZE_MB}MB)`,
        ),
      );
    }
  },
});

/**
 * Uploads a buffer to Cloudinary and returns the URL and public_id.
 * Files are stored in the 'medical-reports' folder with the patient ID as subfolder.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  patientId: string,
  originalName: string,
  mimeType: string,
): Promise<{ url: string; publicId: string; format: string; bytes: number }> {
  return new Promise((resolve, reject) => {
    const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image';
    const folder = `medical-reports/${patientId}`;
    // Sanitise file name
    const sanitisedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `${Date.now()}_${sanitisedName}`,
        use_filename: false,
        unique_filename: false,
      },
      (err, result) => {
        if (err || !result) {
          logger.error(`Cloudinary upload error: ${err?.message}`);
          reject(new Error('File upload failed'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );

    uploadStream.end(buffer);
  });
}

/**
 * Deletes a file from Cloudinary by its public_id.
 */
export async function deleteFromCloudinary(
  publicId: string,
  mimeType?: string,
): Promise<void> {
  const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image';
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
