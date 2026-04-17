import request from 'supertest';
import jwt from 'jsonwebtoken';
import axios from 'axios';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'patient-test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/patientdb-test';
process.env.CLOUDINARY_CLOUD_NAME = 'dummy';
process.env.CLOUDINARY_API_KEY = 'dummy';
process.env.CLOUDINARY_API_SECRET = 'dummy';

import { app } from '../index';
import { Patient } from '../models/Patient';
import { MedicalReport } from '../models/MedicalReport';

jest.mock('axios');

jest.mock('../models/Patient', () => ({
  Patient: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../models/MedicalReport', () => ({
  MedicalReport: {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../config/cloudinary', () => ({
  upload: {
    single: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  },
  uploadToCloudinary: jest.fn(),
}));

const mockedPatient = Patient as unknown as {
  findOne: jest.Mock;
  create: jest.Mock;
  findOneAndUpdate: jest.Mock;
  findById: jest.Mock;
  find: jest.Mock;
  countDocuments: jest.Mock;
};

const mockedMedicalReport = MedicalReport as unknown as {
  create: jest.Mock;
  find: jest.Mock;
  countDocuments: jest.Mock;
};

const mockedAxios = axios as jest.Mocked<typeof axios>;

function authHeader(role: 'patient' | 'doctor' | 'admin', userId = 'u1'): string {
  const token = jwt.sign(
    { userId, role, email: `${role}@example.com`, name: `${role} user` },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' },
  );

  return `Bearer ${token}`;
}

describe('patient service routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ data: { appointments: [] } } as never);
  });

  it('auto-creates profile when missing', async () => {
    mockedPatient.findOne.mockResolvedValueOnce(null);
    mockedPatient.create.mockResolvedValueOnce({
      _id: { toString: () => 'p1' },
      userId: 'patient-1',
      name: 'patient user',
      email: 'patient@example.com',
    });

    const res = await request(app)
      .get('/api/patients/profile')
      .set('Authorization', authHeader('patient', 'patient-1'));

    expect(res.status).toBe(200);
    expect(res.body.patient.userId).toBe('patient-1');
  });

  it('rejects invalid gender on profile update', async () => {
    const res = await request(app)
      .put('/api/patients/profile')
      .set('Authorization', authHeader('patient', 'patient-1'))
      .send({ gender: 'invalid-value' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gender must be one of/i);
  });

  it('rejects report upload when file is missing', async () => {
    const res = await request(app)
      .post('/api/patients/reports')
      .set('Authorization', authHeader('patient', 'patient-1'))
      .send({ title: 'X-Ray', reportType: 'imaging' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No file uploaded/i);
  });

  it('lists patients for admin with pagination', async () => {
    mockedPatient.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: async () => [{ _id: 'p1', name: 'Patient One', email: 'p1@example.com' }],
        }),
      }),
    });
    mockedPatient.countDocuments.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/patients?page=1&limit=20')
      .set('Authorization', authHeader('admin', 'admin-1'));

    expect(res.status).toBe(200);
    expect(res.body.patients).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  it('returns empty history when patient profile does not exist', async () => {
    mockedPatient.findOne.mockResolvedValueOnce(null);
    mockedMedicalReport.find.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/patients/history')
      .set('Authorization', authHeader('patient', 'patient-404'));

    expect(res.status).toBe(200);
    expect(res.body.history).toEqual([]);
    expect(res.body.appointments).toEqual([]);
  });

  it('supports /hostory alias and includes appointments', async () => {
    const patientDoc = {
      _id: { toString: () => 'p1' },
      userId: 'patient-1',
      name: 'Patient One',
      email: 'patient@example.com',
    };

    mockedPatient.findOne.mockResolvedValueOnce(patientDoc as never);
    mockedMedicalReport.find.mockReturnValue({
      sort: () => ({
        limit: async () => [],
      }),
    } as never);

    mockedAxios.get.mockResolvedValueOnce({
      data: { appointments: [{ id: 'a1', status: 'COMPLETED' }] },
    } as never);

    const res = await request(app)
      .get('/api/patients/hostory')
      .set('Authorization', authHeader('patient', 'patient-1'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.appointments)).toBe(true);
    expect(res.body.appointments[0].id).toBe('a1');
  });
});
