import { Doctor } from './models/Doctor';
import { Prescription } from './models/Prescription';

const SEED_DOCTOR_USER_ID = '000000000000000000000003';
const SEED_PATIENT_USER_ID = '000000000000000000000002';
const SEED_APPOINTMENT_ID = '00000000-0000-4000-8000-000000000001';

export async function runSeeders(): Promise<void> {
  try {
    const existingDoctor = await Doctor.findOne({ userId: SEED_DOCTOR_USER_ID }).lean();
    if (!existingDoctor) {
      await Doctor.create({
        userId: SEED_DOCTOR_USER_ID,
        name: 'Dr. Kumari Fernando',
        email: 'doctor@healthcare.dev',
        specialty: 'Cardiology',
        bio: 'Consultant cardiologist available for telemedicine and in-person follow-ups.',
        qualifications: ['MBBS', 'MD Cardiology'],
        consultationFee: 25,
        isVerified: true,
        availableSlots: [
          {
            slotId: 'slot-seed-001',
            date: new Date('2026-04-20T00:00:00.000Z'),
            startTime: '09:00',
            endTime: '09:30',
            isBooked: false,
          },
        ],
      });

      console.log('[doctor-service] Seeded doctor profile: doctor@healthcare.dev');
    }

    const existingPrescription = await Prescription.findOne({ appointmentId: SEED_APPOINTMENT_ID }).lean();
    if (!existingPrescription) {
      await Prescription.create({
        doctorId: SEED_DOCTOR_USER_ID,
        doctorName: 'Dr. Kumari Fernando',
        patientId: SEED_PATIENT_USER_ID,
        appointmentId: SEED_APPOINTMENT_ID,
        medications: [
          {
            name: 'Vitamin D',
            dosage: '1000 IU',
            frequency: 'Once daily',
          },
        ],
        notes: 'Seed prescription entry for demo/testing.',
        issuedAt: new Date('2026-04-16T09:45:00.000Z'),
      });

      console.log('[doctor-service] Seeded doctor prescription for demo patient');
    }
  } catch (error) {
    console.error(`[doctor-service] Seeder failed: ${(error as Error).message}`);
  }
}
