import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  role: 'patient' | 'doctor' | 'admin';
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifies the Bearer JWT (either from Authorization header or from
 * the x-user-id / x-user-role headers forwarded by the API Gateway).
 * API Gateway forwards x-user-* headers after it validates the token,
 * so in production traffic these headers are trusted. In direct calls
 * (e.g., testing) we fall back to parsing the Bearer token ourselves.
 */
export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  // Trust headers set by API Gateway (internal network only)
  const userId = req.headers['x-user-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined;
  const email = req.headers['x-user-email'] as string | undefined;
  const name = req.headers['x-user-name'] as string | undefined;

  if (userId && role) {
    req.user = {
      userId,
      role: role as JwtPayload['role'],
      email: email || '',
      name: name || '',
    };
    return next();
  }

  // Fallback: direct Bearer token validation (for local dev / testing)
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
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
