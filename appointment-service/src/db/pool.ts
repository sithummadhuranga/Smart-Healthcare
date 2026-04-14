import { Pool } from 'pg';

let poolInstance: Pool | undefined;

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
