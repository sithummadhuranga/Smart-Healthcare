import { Pool } from 'pg';

const connectionString = process.env.APPOINTMENT_DB_URL;

if (!connectionString) {
  throw new Error('APPOINTMENT_DB_URL is not configured');
}

export const pool = new Pool({ connectionString });
