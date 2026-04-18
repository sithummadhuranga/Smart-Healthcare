import { Pool } from 'pg';
import { URL } from 'url';

let poolInstance: Pool | undefined;

const schemaStatements = [
  'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
  `CREATE TABLE IF NOT EXISTS appointments (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id       VARCHAR     NOT NULL,
      doctor_id        VARCHAR     NOT NULL,
      slot_id          VARCHAR     NOT NULL,
      consultation_type VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
      reason           TEXT,
      status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      rejection_reason TEXT,
      scheduled_at     TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(20) NOT NULL DEFAULT 'ONLINE';",
  'CREATE INDEX IF NOT EXISTS idx_app_patient ON appointments (patient_id);',
  'CREATE INDEX IF NOT EXISTS idx_app_doctor ON appointments (doctor_id);',
  'CREATE INDEX IF NOT EXISTS idx_app_status ON appointments (status);',
  'CREATE INDEX IF NOT EXISTS idx_app_slot ON appointments (doctor_id, slot_id);',
  'DROP INDEX IF EXISTS uq_active_doctor_slot;',
  `CREATE OR REPLACE FUNCTION update_appointments_updated_at()
     RETURNS TRIGGER AS $$
     BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;`,
  'DROP TRIGGER IF EXISTS set_appointments_updated_at ON appointments;',
  `CREATE TRIGGER set_appointments_updated_at
     BEFORE UPDATE ON appointments
     FOR EACH ROW EXECUTE FUNCTION update_appointments_updated_at();`,
];

const seedStatements = [
    `INSERT INTO appointments (id, patient_id, doctor_id, slot_id, consultation_type, reason, status, scheduled_at)
   SELECT '00000000-0000-4000-8000-000000000001', '000000000000000000000002', '000000000000000000000003', 'slot-seed-001',
      'ONLINE', 'Seeded sample appointment for UI verification', 'PENDING', NOW() + INTERVAL '1 day'
   WHERE NOT EXISTS (SELECT 1 FROM appointments);`,
];

function createPool(): Pool {
  const connectionString = process.env.APPOINTMENT_DB_URL;
  if (!connectionString) {
    throw new Error('APPOINTMENT_DB_URL is not configured');
  }

  return new Pool({ connectionString });
}

export function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = createPool();
  }

  return poolInstance;
}

function parseConnectionString(connectionString: string): {
  adminConnectionString: string;
  databaseName: string;
} {
  const parsed = new URL(connectionString);
  const databaseName = parsed.pathname.replace(/^\//, '');
  if (!databaseName) {
    throw new Error('APPOINTMENT_DB_URL must include a database name');
  }

  parsed.pathname = '/postgres';
  return {
    adminConnectionString: parsed.toString(),
    databaseName,
  };
}

async function ensureDatabaseExists(connectionString: string): Promise<void> {
  const { adminConnectionString, databaseName } = parseConnectionString(connectionString);
  const adminPool = new Pool({ connectionString: adminConnectionString });
  try {
    const exists = await adminPool.query<{ present: number }>(
      'SELECT 1::int AS present FROM pg_database WHERE datname = $1 LIMIT 1',
      [databaseName]
    );

    if (exists.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
    }
  } finally {
    await adminPool.end();
  }
}

export async function initializeDatabase(): Promise<void> {
  const connectionString = process.env.APPOINTMENT_DB_URL;
  if (!connectionString) {
    throw new Error('APPOINTMENT_DB_URL is not configured');
  }

  await ensureDatabaseExists(connectionString);
  const pool = getPool();

  for (const statement of schemaStatements) {
    await pool.query(statement);
  }

  if ((process.env.SEED_DEMO_DATA || 'true').toLowerCase() === 'true') {
    for (const statement of seedStatements) {
      await pool.query(statement);
    }
  }
}

export const pool: Pool = new Proxy({} as Pool, {
  get(_target, property, receiver) {
    const target = getPool() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(target, property, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
  set(_target, property, value, receiver) {
    const target = getPool() as unknown as Record<PropertyKey, unknown>;
    return Reflect.set(target, property, value, receiver);
  },
});
