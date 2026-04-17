import request from 'supertest';
import jwt from 'jsonwebtoken';
import axios from 'axios';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'doctor-test-secret';

import { app } from '../index';
import { Doctor } from '../models/Doctor';
import { Prescription } from '../models/Prescription';

jest.mock('../models/Doctor', () => ({
  Doctor: {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../models/Prescription', () => ({
  Prescription: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('axios');

const mockedDoctor = Doctor as unknown as {
  find: jest.Mock;
  findById: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
};

const mockedPrescription = Prescription as unknown as {
  create: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
};

const mockedAxiosGet = axios.get as jest.Mock;

function authHeader(role: 'patient' | 'doctor' | 'admin', userId = 'u1'): string {
  const token = jwt.sign(
    { userId, role, email: `${role}@example.com`, name: `${role} user` },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' }
  );

  return `Bearer ${token}`;
}

describe('doctor service routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APPOINTMENT_SERVICE_URL = 'http://appointment-service:3004';
    process.env.PATIENT_SERVICE_URL = 'http://patient-service:3002';
  });

  it('lists public doctors', async () => {
    mockedDoctor.find.mockReturnValue({
      select: () => ({
        lean: async () => [
          { _id: 'd1', name: 'Dr. A', specialty: 'Cardiology', isVerified: true, availableSlots: [] },
        ],
      }),
    });

    const res = await request(app).get('/api/doctors');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Dr. A');
  });

  it('updates own profile as doctor', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    mockedDoctor.findOne.mockResolvedValue({
      userId: 'doc-1',
      name: 'Doc',
      email: 'doc@example.com',
      specialty: '',
      bio: '',
      qualifications: [],
      consultationFee: 0,
      isVerified: false,
      availableSlots: [],
      save,
    });

    const res = await request(app)
      .put('/api/doctors/profile')
      .set('Authorization', authHeader('doctor', 'doc-1'))
      .send({
        specialty: 'Dermatology',
        bio: 'Skin specialist',
        consultationFee: 4500,
        qualifications: ['MBBS'],
      });

    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalled();
    expect(res.body.specialty).toBe('Dermatology');
  });

  it('rejects prescription payload with missing medications', async () => {
    const res = await request(app)
      .post('/api/doctors/prescriptions')
      .set('Authorization', authHeader('doctor', 'doc-1'))
      .send({ patientId: 'p1', appointmentId: 'a1', medications: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('non-empty medications');
  });

  it('creates prescription with valid payload', async () => {
    mockedAxiosGet
      .mockResolvedValueOnce({
        data: {
          id: 'a1',
          patientId: 'p1',
          doctorId: 'doc-1',
          status: 'COMPLETED',
        },
      })
      .mockResolvedValueOnce({
        data: {
          patient: {
            name: 'Test Patient',
          },
        },
      });

    mockedPrescription.findOne.mockReturnValue({
      select: () => ({
        lean: async () => null,
      }),
    });
    mockedPrescription.create.mockResolvedValue({
      _id: 'pr-1',
      doctorId: 'doc-1',
      patientId: 'p1',
      appointmentId: 'a1',
      medications: [{ name: 'Med', dosage: '1 tab', frequency: 'daily' }],
      notes: 'after meals',
    });

    const res = await request(app)
      .post('/api/doctors/prescriptions')
      .set('Authorization', authHeader('doctor', 'doc-1'))
      .send({
        patientId: 'p1',
        appointmentId: 'a1',
        medications: [{ name: 'Med', dosage: '1 tab', frequency: 'daily' }],
        notes: 'after meals',
      });

    expect(res.status).toBe(201);
    expect(mockedPrescription.create).toHaveBeenCalledTimes(1);
    expect(res.body._id).toBe('pr-1');
  });

  it('allows admin to verify doctor', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    mockedDoctor.findById.mockResolvedValue({
      _id: 'doc-2',
      isVerified: false,
      verificationReason: undefined,
      save,
    });

    const res = await request(app)
      .patch('/api/doctors/doc-2/verify')
      .set('Authorization', authHeader('admin', 'admin-1'))
      .send({ verified: true, reason: 'documents valid' });

    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('allows doctor to access patient reports when an appointment relationship exists', async () => {
    mockedAxiosGet
      .mockResolvedValueOnce({
        data: [{ id: 'a1', patientId: 'p1', status: 'CONFIRMED' }],
      })
      .mockResolvedValueOnce({
        data: { reports: [{ _id: 'r1', title: 'CBC' }] },
      });

    const res = await request(app)
      .get('/api/doctors/patients/p1/reports')
      .set('Authorization', authHeader('doctor', 'doc-1'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].title).toBe('CBC');
  });

  it('blocks doctor from accessing unrelated patient reports', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: [{ id: 'a1', patientId: 'other-patient', status: 'CONFIRMED' }],
    });

    const res = await request(app)
      .get('/api/doctors/patients/p1/reports')
      .set('Authorization', authHeader('doctor', 'doc-1'));

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/active or completed consultations/i);
  });

  it('blocks doctor when only cancelled or rejected appointments exist', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: [
        { id: 'a1', patientId: 'p1', status: 'CANCELLED' },
        { id: 'a2', patientId: 'p1', status: 'REJECTED' },
      ],
    });

    const res = await request(app)
      .get('/api/doctors/patients/p1/reports')
      .set('Authorization', authHeader('doctor', 'doc-1'));

    expect(res.status).toBe(403);
  });
});
