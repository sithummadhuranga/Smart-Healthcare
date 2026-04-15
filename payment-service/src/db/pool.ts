// FILE: src/db/pool.ts
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const connectionString = process.env.PAYMENT_DB_URL;

if (!connectionString) {
  throw new Error('[payment-service] PAYMENT_DB_URL is not configured');
}

const buildFallbackConnectionString = (value: string): string => {
  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.hostname === 'postgres') {
      parsedUrl.hostname = 'localhost';
      return parsedUrl.toString();
    }

    return value;
  } catch {
    return value;
  }
};

const primaryConnectionString = connectionString;
const fallbackConnectionString = buildFallbackConnectionString(connectionString);

export let pool = new Pool({
  connectionString: primaryConnectionString,
  max: Number(process.env.PGPOOL_MAX_CONNECTIONS || '10'),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

let databaseReady = false;
let initPromise: Promise<void> | null = null;

const describeError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const aggregateLikeError = error as { errors?: unknown[] };
    const firstError = aggregateLikeError.errors?.[0];

    if (firstError instanceof Error && firstError.message) {
      return firstError.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'unknown error';
};

const schemaStatements = [
  'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
  `CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id VARCHAR NOT NULL,
    patient_id VARCHAR NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR DEFAULT 'usd',
    payment_method VARCHAR,
    stripe_payment_intent_id VARCHAR UNIQUE,
    stripe_charge_id VARCHAR,
    status VARCHAR DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS payment_webhook_events (
    event_id VARCHAR PRIMARY KEY,
    event_type VARCHAR NOT NULL,
    stripe_payment_intent_id VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'PROCESSING',
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,
  'ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();',
  'ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR;',
  'ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();',
  'CREATE INDEX IF NOT EXISTS idx_payments_appointment_id_created_at ON payments (appointment_id, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_payments_patient_id_created_at ON payments (patient_id, created_at DESC);',
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_pending_appointment ON payments (appointment_id) WHERE status = 'PENDING';",
  'CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_status ON payment_webhook_events (status, created_at DESC);',
];

export const initializeDatabase = async (): Promise<void> => {
  try {
    let client = await pool.connect();

    try {
      for (const statement of schemaStatements) {
        await client.query(statement);
      }

      console.log('[payment-service] PostgreSQL connected and schema verified');
      databaseReady = true;
      return;
    } finally {
      client.release();
    }
  } catch (error) {
    const isConnectionError =
      error instanceof Error &&
      ((error as Error & { code?: string }).code === 'ENOTFOUND' ||
        (error as Error & { code?: string }).code === 'ECONNREFUSED');

    if (isConnectionError && fallbackConnectionString !== primaryConnectionString) {
      console.warn('[payment-service] Primary PostgreSQL host unavailable, retrying localhost fallback');

      try {
        await pool.end().catch(() => undefined);
        pool = new Pool({
          connectionString: fallbackConnectionString,
          max: Number(process.env.PGPOOL_MAX_CONNECTIONS || '10'),
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
        });

        const fallbackClient = await pool.connect();

        try {
          for (const statement of schemaStatements) {
            await fallbackClient.query(statement);
          }

          console.log('[payment-service] PostgreSQL connected and schema verified using localhost fallback');
          databaseReady = true;
          return;
        } finally {
          fallbackClient.release();
        }
      } catch (fallbackError) {
        const message = describeError(fallbackError);
        console.warn(`[payment-service] PostgreSQL unavailable, starting without database (${message})`);
        databaseReady = false;
        return;
      }
    }

    const message = describeError(error);
    console.warn(`[payment-service] PostgreSQL startup check failed, starting without database (${message})`);
    databaseReady = false;
  }
};

export const isDatabaseReady = (): boolean => databaseReady;

export const ensureDatabaseConnection = async (): Promise<boolean> => {
  if (databaseReady) {
    return true;
  }

  if (!initPromise) {
    initPromise = initializeDatabase().finally(() => {
      initPromise = null;
    });
  }

  await initPromise;
  return databaseReady;
};

export default pool;