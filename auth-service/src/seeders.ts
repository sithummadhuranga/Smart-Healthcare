import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from './models/User';
import logger from './logger';

// Fixed ObjectIds so patient-service can link profiles by known user IDs
const SEED_ADMIN_ID    = new mongoose.Types.ObjectId('000000000000000000000001');
const SEED_PATIENT_ID  = new mongoose.Types.ObjectId('000000000000000000000002');
const SEED_DOCTOR_ID   = new mongoose.Types.ObjectId('000000000000000000000003');

const SALT_ROUNDS = 12;

interface SeedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
  isVerified: boolean;
  isActive: boolean;
}

const DEMO_USERS: SeedUser[] = [
  {
    _id: SEED_ADMIN_ID,
    name: 'System Administrator',
    email: 'admin@healthcare.dev',
    password: 'Admin@1234!',
    role: 'admin',
    isVerified: true,
    isActive: true,
  },
  {
    _id: SEED_PATIENT_ID,
    name: 'Amal Perera',
    email: 'patient@healthcare.dev',
    password: 'Patient@1234!',
    role: 'patient',
    isVerified: true,
    isActive: true,
  },
  {
    _id: SEED_DOCTOR_ID,
    name: 'Dr. Kumari Fernando',
    email: 'doctor@healthcare.dev',
    password: 'Doctor@1234!',
    role: 'doctor',
    isVerified: true,
    isActive: true,
  },
];

export async function runSeeders(): Promise<void> {
  try {
    for (const userData of DEMO_USERS) {
      const existing = await User.findOne({ email: userData.email }).lean();
      if (existing) {
        continue;
      }

      const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

      await User.create({
        _id: userData._id,
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        isVerified: userData.isVerified,
        isActive: userData.isActive,
      });

      logger.info(`[auth-service] Seeded user: ${userData.email} (${userData.role})`);
    }

    logger.info('[auth-service] Seeder complete');
  } catch (err) {
    logger.error(`[auth-service] Seeder failed: ${(err as Error).message}`);
  }
}
