import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'gateway-test-secret';
process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:1';
process.env.PATIENT_SERVICE_URL = 'http://127.0.0.1:1';
process.env.DOCTOR_SERVICE_URL = 'http://127.0.0.1:1';
process.env.APPOINTMENT_SERVICE_URL = 'http://127.0.0.1:1';
process.env.TELEMEDICINE_SERVICE_URL = 'http://127.0.0.1:1';
process.env.PAYMENT_SERVICE_URL = 'http://127.0.0.1:1';
process.env.NOTIFICATION_SERVICE_URL = 'http://127.0.0.1:1';
process.env.AI_SERVICE_URL = 'http://127.0.0.1:1';

import { app } from '../index';

function authHeader(role: 'patient' | 'doctor' | 'admin', userId = 'u1'): string {
  const token = jwt.sign(
    { userId, role, email: `${role}@example.com`, name: `${role} user` },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' },
  );

  return `Bearer ${token}`;
}

describe('api-gateway auth and routing guards', () => {
  it('returns health status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'api-gateway' });
  });

  it('allows public auth routes without JWT (fails at upstream only)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'x' });

    expect([502, 503]).toContain(res.status);
  });

  it('blocks protected patient route without JWT', async () => {
    const res = await request(app).get('/api/patients/profile');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Missing or malformed/i);
  });

  it('rejects patient role on doctor protected route', async () => {
    const res = await request(app)
      .put('/api/doctors/profile')
      .set('Authorization', authHeader('patient'))
      .send({ specialty: 'Cardiology' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Insufficient role permissions/i);
  });

  it('allows public doctor GET without JWT (fails at upstream only)', async () => {
    const res = await request(app).get('/api/doctors');

    expect([502, 503]).toContain(res.status);
  });

  it('rejects invalid token on protected route', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', 'Bearer invalid.token.value');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid token/i);
  });
});
