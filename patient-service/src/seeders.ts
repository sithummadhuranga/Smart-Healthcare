import { Patient } from './models/Patient';
import logger from './logger';

// Must match the fixed ObjectIds seeded in auth-service/src/seeders.ts
const SEED_PATIENT_USER_ID = '000000000000000000000002';

const DEMO_PATIENTS = [
  {
    userId: SEED_PATIENT_USER_ID,
    name: 'Amal Perera',
    email: 'patient@healthcare.dev',
    dateOfBirth: new Date('1990-04-12'),
    gender: 'male' as const,
    phone: '+94711234567',
    address: {
      street: '42 Galle Road',
      city: 'Colombo',
      district: 'Colombo',
      country: 'Sri Lanka',
    },
    bloodGroup: 'O+' as const,
    allergies: ['Penicillin', 'Pollen'],
    chronicConditions: ['Mild Hypertension'],
    emergencyContact: {
      name: 'Kamala Perera',
      phone: '+94719876543',
      relationship: 'Mother',
    },
  },
];

export async function runSeeders(): Promise<void> {
  try {
    for (const patientData of DEMO_PATIENTS) {
      const existing = await Patient.findOne({ userId: patientData.userId }).lean();
      if (existing) {
        continue;
      }

      await Patient.create(patientData);
      logger.info(`[patient-service] Seeded patient profile: ${patientData.email}`);
    }

    logger.info('[patient-service] Seeder complete');
  } catch (err) {
    logger.error(`[patient-service] Seeder failed: ${(err as Error).message}`);
  }
}
