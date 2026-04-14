import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type UserRole = 'patient' | 'doctor' | 'admin';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET is missing' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    req.user = jwt.verify(token, jwtSecret) as JwtPayload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireInternalApiKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.INTERNAL_SERVICE_API_KEY;
  if (!expected) {
    res.status(500).json({ error: 'Server misconfiguration: INTERNAL_SERVICE_API_KEY is missing' });
    return;
  }

  const actual = req.header('x-internal-api-key');
  if (!actual || actual !== expected) {
    res.status(401).json({ error: 'Invalid internal service credentials' });
    return;
  }

  next();
}
