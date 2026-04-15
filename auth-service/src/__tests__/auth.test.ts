import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'auth-test-secret';
process.env.JWT_REFRESH_SECRET = 'auth-refresh-test-secret';
process.env.AUTH_MONGODB_URI = 'mongodb://localhost:27017/authdb-test';

import { app } from '../index';
import { User } from '../models/User';

jest.mock('../models/User', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

const mockedUser = User as unknown as {
  findOne: jest.Mock;
  create: jest.Mock;
  findById: jest.Mock;
  find: jest.Mock;
  countDocuments: jest.Mock;
};

describe('auth service endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects register with missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'u@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('registers a patient successfully', async () => {
    mockedUser.findOne.mockResolvedValue(null);
    mockedUser.create.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      role: 'patient',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123',
      role: 'patient',
    });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('507f1f77bcf86cd799439011');
  });

  it('rejects login for unknown email', async () => {
    mockedUser.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'Password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid email or password/i);
  });

  it('rejects refresh when cookie is missing', async () => {
    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Refresh token not provided/i);
  });

  it('returns current user profile with valid token', async () => {
    const token = jwt.sign(
      {
        userId: 'u-1',
        role: 'patient',
        email: 'patient@example.com',
        name: 'Patient User',
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      userId: 'u-1',
      role: 'patient',
      email: 'patient@example.com',
      name: 'Patient User',
    });
  });
});
