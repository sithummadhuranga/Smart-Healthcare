import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import type { UserRole } from '../models/User';
import { JwtPayload } from '../middleware/verifyToken';
import logger from '../logger';
import { recordAuditEvent } from '../services/auditLogService';

const BCRYPT_SALT_ROUNDS = 12;
const COOKIE_NAME = 'refreshToken';

// ── Token helpers ──────────────────────────────────────────────────────────────

function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = process.env.JWT_SECRET!;
  const expiry = process.env.JWT_EXPIRY || '15m';
  return jwt.sign(payload, secret, { expiresIn: expiry } as jwt.SignOptions);
}

function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = process.env.JWT_REFRESH_SECRET!;
  const expiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  return jwt.sign(payload, secret, { expiresIn: expiry } as jwt.SignOptions);
}

function setRefreshCookie(res: Response, token: string): void {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/api/auth',
  });
}

// ── POST /api/auth/register ────────────────────────────────────────────────────

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    // Input validation
    if (!name || !email || !password || !role) {
      await recordAuditEvent(req, {
        action: 'auth.register',
        outcome: 'failure',
        email,
        metadata: { reason: 'missing_required_fields' },
      });
      res.status(400).json({ error: 'name, email, password, and role are required' });
      return;
    }
    if (!['patient', 'doctor'].includes(role)) {
      await recordAuditEvent(req, {
        action: 'auth.register',
        outcome: 'failure',
        email,
        metadata: { reason: 'invalid_role', role },
      });
      res.status(400).json({ error: 'role must be "patient" or "doctor"' });
      return;
    }
    if (password.length < 8) {
      await recordAuditEvent(req, {
        action: 'auth.register',
        outcome: 'failure',
        email,
        metadata: { reason: 'password_too_short' },
      });
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    // Duplicate email check
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      await recordAuditEvent(req, {
        action: 'auth.register',
        outcome: 'failure',
        email,
        targetUserId: existing._id.toString(),
        metadata: { reason: 'duplicate_email' },
      });
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role as UserRole,
    });

    logger.info(`New user registered: ${user._id} (${role})`);
    await recordAuditEvent(req, {
      action: 'auth.register',
      outcome: 'success',
      actorUserId: user._id.toString(),
      targetUserId: user._id.toString(),
      email: user.email,
      metadata: { role: user.role },
    });

    res.status(201).json({
      userId: user._id.toString(),
      message:
        role === 'doctor'
          ? 'Registration successful. Await admin verification before you can login.'
          : 'Registration successful',
    });
  } catch (err) {
    logger.error(`register error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── POST /api/auth/login ───────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      await recordAuditEvent(req, {
        action: 'auth.login',
        outcome: 'failure',
        email,
        metadata: { reason: 'missing_credentials' },
      });
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      await recordAuditEvent(req, {
        action: 'auth.login',
        outcome: 'failure',
        email,
        metadata: { reason: 'unknown_email' },
      });
      // Return same message as wrong password to prevent user enumeration
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      await recordAuditEvent(req, {
        action: 'auth.login',
        outcome: 'failure',
        actorUserId: user._id.toString(),
        targetUserId: user._id.toString(),
        email: user.email,
        metadata: { reason: 'inactive_account', role: user.role },
      });
      res.status(403).json({ error: 'Account has been deactivated. Contact support.' });
      return;
    }

    if (user.role === 'doctor' && !user.isVerified) {
      await recordAuditEvent(req, {
        action: 'auth.login',
        outcome: 'failure',
        actorUserId: user._id.toString(),
        targetUserId: user._id.toString(),
        email: user.email,
        metadata: { reason: 'doctor_not_verified', role: user.role },
      });
      res.status(403).json({
        error: 'Doctor account pending admin verification. Please wait for approval.',
      });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      await recordAuditEvent(req, {
        action: 'auth.login',
        outcome: 'failure',
        actorUserId: user._id.toString(),
        targetUserId: user._id.toString(),
        email: user.email,
        metadata: { reason: 'invalid_password', role: user.role },
      });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    setRefreshCookie(res, refreshToken);

    logger.info(`User logged in: ${user._id}`);
    await recordAuditEvent(req, {
      action: 'auth.login',
      outcome: 'success',
      actorUserId: user._id.toString(),
      targetUserId: user._id.toString(),
      email: user.email,
      metadata: { role: user.role },
    });

    res.status(200).json({ accessToken });
  } catch (err) {
    logger.error(`login error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── POST /api/auth/refresh ─────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const token: string | undefined = req.cookies?.[COOKIE_NAME];
    if (!token) {
      await recordAuditEvent(req, {
        action: 'auth.refresh',
        outcome: 'failure',
        metadata: { reason: 'missing_refresh_cookie' },
      });
      res.status(401).json({ error: 'Refresh token not provided' });
      return;
    }

    const secret = process.env.JWT_REFRESH_SECRET!;
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, secret) as JwtPayload;
    } catch (err) {
      // Clear invalid/expired cookie
      res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
      await recordAuditEvent(req, {
        action: 'auth.refresh',
        outcome: 'failure',
        metadata: {
          reason: err instanceof jwt.TokenExpiredError ? 'refresh_token_expired' : 'invalid_refresh_token',
        },
      });
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: 'Refresh token expired, please login again' });
        return;
      }
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    // Verify user still exists and is active
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
      await recordAuditEvent(req, {
        action: 'auth.refresh',
        outcome: 'failure',
        actorUserId: payload.userId,
        targetUserId: payload.userId,
        email: payload.email,
        metadata: { reason: 'user_not_found_or_inactive' },
      });
      res.status(401).json({ error: 'User not found or deactivated' });
      return;
    }

    const newAccessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    });

    await recordAuditEvent(req, {
      action: 'auth.refresh',
      outcome: 'success',
      actorUserId: user._id.toString(),
      targetUserId: user._id.toString(),
      email: user.email,
      metadata: { role: user.role },
    });

    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    logger.error(`refresh error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── POST /api/auth/logout ──────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
    await recordAuditEvent(req, {
      action: 'auth.logout',
      outcome: 'success',
      actorUserId: req.user?.userId,
      targetUserId: req.user?.userId,
      email: req.user?.email,
      metadata: { role: req.user?.role },
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error(`logout error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── GET /api/auth/me ───────────────────────────────────────────────────────────

export async function me(req: Request, res: Response): Promise<void> {
  try {
    // req.user is populated by verifyToken middleware
    const { userId, role, email, name } = req.user!;
    res.status(200).json({ userId, role, email, name });
  } catch (err) {
    logger.error(`me error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── GET /api/auth/users — admin only ─────────────────────────────────────────

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const roleFilter = req.query['role'] as string | undefined;

    const filter: Record<string, unknown> = {};
    if (roleFilter && ['patient', 'doctor', 'admin'].includes(roleFilter)) {
      filter['role'] = roleFilter;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error(`listUsers error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── PATCH /api/auth/users/:id/verify — admin verifies a doctor ────────────────

export async function verifyDoctor(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (user.role !== 'doctor') {
      res.status(400).json({ error: 'User is not a doctor' });
      return;
    }

    user.isVerified = true;
    await user.save();

    logger.info(`Doctor verified by admin: ${id}`);
    await recordAuditEvent(req, {
      action: 'admin.user.verify',
      outcome: 'success',
      actorUserId: req.user?.userId,
      targetUserId: id,
      email: user.email,
      metadata: { targetRole: user.role },
    });
    res.status(200).json({ message: 'Doctor verified successfully', userId: id });
  } catch (err) {
    logger.error(`verifyDoctor error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── PATCH /api/auth/users/:id/deactivate — admin deactivates account ──────────

export async function deactivateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.isActive = false;
    await user.save();

    logger.info(`User deactivated by admin: ${id}`);
    await recordAuditEvent(req, {
      action: 'admin.user.deactivate',
      outcome: 'success',
      actorUserId: req.user?.userId,
      targetUserId: id,
      email: user.email,
      metadata: { targetRole: user.role },
    });
    res.status(200).json({ message: 'User deactivated', userId: id });
  } catch (err) {
    logger.error(`deactivateUser error: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}
