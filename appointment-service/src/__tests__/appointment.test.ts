import request from 'supertest';
import jwt from 'jsonwebtoken';
import axios from 'axios';

process.env.NODE_ENV = 'test';

import { app } from '../index';
import { pool } from '../db/pool';
import { publishNotificationEvent } from '../services/rabbitmqPublisher';

jest.mock('../db/pool', () => ({
  pool: {
    query: jest.fn(),
    end: jest.fn(),
  },
}));

jest.mock('../services/rabbitmqPublisher', () => ({
  publishNotificationEvent: jest.fn(),
  closeRabbitConnections: jest.fn(),
}));

jest.mock('axios');

const mockedPoolQuery = pool.query as jest.Mock;
const mockedAxiosGet = axios.get as jest.Mock;
const mockedPublish = publishNotificationEvent as jest.Mock;

const APPOINTMENT_IDS = {
  booking: '11111111-1111-4111-8111-111111111111',
  modify: '22222222-2222-4222-8222-222222222222',
  cancel: '33333333-3333-4333-8333-333333333333',
  completed: '44444444-4444-4444-8444-444444444444',
  accept: '55555555-5555-4555-8555-555555555555',
  confirmed: '66666666-6666-4666-8666-666666666666',
  forbidden: '77777777-7777-4777-8777-777777777777',
};

function signToken(role: 'patient' | 'doctor' | 'admin', userId: string): string {
  return jwt.sign(
    {
      userId,
      role,
      email: `${role}@example.com`,
      name: `${role} user`,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' }
  );
}

function authHeader(role: 'patient' | 'doctor' | 'admin', userId: string): string {
  return `Bearer ${signToken(role, userId)}`;
}

describe('appointment service booking and transitions', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.DOCTOR_SERVICE_URL = 'http://doctor-service:3003';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a valid booking with PENDING status', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        _id: 'doctor-1',
        availableSlots: [
          {
            slotId: 'slot-1',
            date: '2026-05-10T00:00:00.000Z',
            startTime: '09:00',
            endTime: '09:30',
            isBooked: false,
          },
        ],
      },
    });

    mockedPoolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: APPOINTMENT_IDS.booking,
            patient_id: 'patient-1',
            doctor_id: 'doctor-1',
            slot_id: 'slot-1',
            reason: 'Fever',
            status: 'PENDING',
            rejection_reason: null,
            scheduled_at: '2026-05-10T09:00:00.000Z',
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:00:00.000Z',
          },
        ],
      });

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', authHeader('patient', 'patient-1'))
      .send({ doctorId: 'doctor-1', slotId: 'slot-1', reason: 'Fever' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.patientId).toBe('patient-1');
    expect(mockedPublish).toHaveBeenCalledTimes(1);
  });

  it('rejects double booking with 409', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        _id: 'doctor-1',
        availableSlots: [
          {
            slotId: 'slot-1',
            date: '2026-05-10T00:00:00.000Z',
            startTime: '09:00',
            endTime: '09:30',
            isBooked: false,
          },
        ],
      },
    });

    mockedPoolQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-apt' }] });

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', authHeader('patient', 'patient-1'))
      .send({ doctorId: 'doctor-1', slotId: 'slot-1', reason: 'Headache' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already booked');
  });

  it('modifies an appointment by patient and resets status to PENDING', async () => {
    mockedPoolQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: APPOINTMENT_IDS.modify,
            patient_id: 'patient-1',
            doctor_id: 'doctor-1',
            slot_id: 'slot-old',
            reason: 'Old reason',
            status: 'CONFIRMED',
            rejection_reason: null,
            scheduled_at: '2026-05-10T08:00:00.000Z',
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: APPOINTMENT_IDS.modify,
            patient_id: 'patient-1',
            doctor_id: 'doctor-2',
            slot_id: 'slot-new',
            reason: 'Updated reason',
            status: 'PENDING',
            rejection_reason: null,
            scheduled_at: '2026-05-11T10:00:00.000Z',
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:10:00.000Z',
          },
        ],
      });

    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        _id: 'doctor-2',
        availableSlots: [
          {
            slotId: 'slot-new',
            date: '2026-05-11T00:00:00.000Z',
            startTime: '10:00',
            endTime: '10:30',
            isBooked: false,
          },
        ],
      },
    });

    const res = await request(app)
      .patch(`/api/appointments/${APPOINTMENT_IDS.modify}/modify`)
      .set('Authorization', authHeader('patient', 'patient-1'))
      .send({ doctorId: 'doctor-2', slotId: 'slot-new', reason: 'Updated reason' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.doctorId).toBe('doctor-2');
    expect(res.body.slotId).toBe('slot-new');
  });

  it('cancels a patient own pending appointment', async () => {
    mockedPoolQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: APPOINTMENT_IDS.cancel,
            patient_id: 'patient-1',
            doctor_id: 'doctor-2',
            slot_id: 'slot-2',
            reason: 'Checkup',
            status: 'PENDING',
            rejection_reason: null,
            scheduled_at: null,
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: APPOINTMENT_IDS.cancel,
            patient_id: 'patient-1',
            doctor_id: 'doctor-2',
            slot_id: 'slot-2',
            reason: 'Checkup',
            status: 'CANCELLED',
            rejection_reason: null,
            scheduled_at: null,
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:05:00.000Z',
          },
        ],
      });

    const res = await request(app)
      .patch(`/api/appointments/${APPOINTMENT_IDS.cancel}/cancel`)
      .set('Authorization', authHeader('patient', 'patient-1'));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
  });

  it('rejects cancel on completed appointment', async () => {
    mockedPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: APPOINTMENT_IDS.completed,
          patient_id: 'patient-1',
          doctor_id: 'doctor-2',
          slot_id: 'slot-2',
          reason: 'Checkup',
          status: 'COMPLETED',
          rejection_reason: null,
          scheduled_at: null,
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: '2026-05-01T10:05:00.000Z',
        },
      ],
    });

    const res = await request(app)
      .patch(`/api/appointments/${APPOINTMENT_IDS.completed}/cancel`)
      .set('Authorization', authHeader('patient', 'patient-1'));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot cancel');
  });

  it('accepts a pending appointment by owning doctor', async () => {
    mockedPoolQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: APPOINTMENT_IDS.accept,
            patient_id: 'patient-1',
            doctor_id: 'doctor-2',
            slot_id: 'slot-2',
            reason: 'Checkup',
            status: 'PENDING',
            rejection_reason: null,
            scheduled_at: null,
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:05:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: APPOINTMENT_IDS.accept,
            patient_id: 'patient-1',
            doctor_id: 'doctor-2',
            slot_id: 'slot-2',
            reason: 'Checkup',
            status: 'CONFIRMED',
            rejection_reason: null,
            scheduled_at: null,
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:07:00.000Z',
          },
        ],
      });

    const res = await request(app)
      .patch(`/api/appointments/${APPOINTMENT_IDS.accept}/accept`)
      .set('Authorization', authHeader('doctor', 'doctor-2'));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMED');
  });

  it('rejects accepting already confirmed appointment', async () => {
    mockedPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: APPOINTMENT_IDS.confirmed,
          patient_id: 'patient-1',
          doctor_id: 'doctor-2',
          slot_id: 'slot-2',
          reason: 'Checkup',
          status: 'CONFIRMED',
          rejection_reason: null,
          scheduled_at: null,
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: '2026-05-01T10:07:00.000Z',
        },
      ],
    });

    const res = await request(app)
      .patch(`/api/appointments/${APPOINTMENT_IDS.confirmed}/accept`)
      .set('Authorization', authHeader('doctor', 'doctor-2'));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot accept');
  });

  it('rejects unauthorized cancel by different patient', async () => {
    mockedPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: APPOINTMENT_IDS.forbidden,
          patient_id: 'patient-1',
          doctor_id: 'doctor-2',
          slot_id: 'slot-2',
          reason: 'Checkup',
          status: 'PENDING',
          rejection_reason: null,
          scheduled_at: null,
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: '2026-05-01T10:07:00.000Z',
        },
      ],
    });

    const res = await request(app)
      .patch(`/api/appointments/${APPOINTMENT_IDS.forbidden}/cancel`)
      .set('Authorization', authHeader('patient', 'patient-99'));

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('own appointments');
  });
});
