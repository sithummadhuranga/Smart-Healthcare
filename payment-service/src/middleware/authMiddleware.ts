// FILE: src/middleware/authMiddleware.ts
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export type UserRole = 'patient' | 'doctor' | 'admin';

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('[payment-service] JWT_SECRET is not configured');
  }

  return secret;
};

const normalizeRole = (role: unknown): UserRole | null => {
  if (role === 'patient' || role === 'doctor' || role === 'admin') {
    return role;
  }

  return null;
};

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing bearer token' });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload & {
      userId?: unknown;
      role?: unknown;
      email?: unknown;
    };

    const role = normalizeRole(decoded.role);

    if (typeof decoded.userId !== 'string' || typeof decoded.email !== 'string' || !role) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    req.user = {
      userId: decoded.userId,
      role,
      email: decoded.email,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied: insufficient role' });
      return;
    }

    next();
  };
};