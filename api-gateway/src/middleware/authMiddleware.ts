import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../logger';

export interface JwtPayload {
  userId: string;
  role: 'patient' | 'doctor' | 'admin';
  email: string;
  name: string;
  iat: number;
  exp: number;
}

// Extend Express Request so downstream handlers can access token data
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ── Route access matrix ────────────────────────────────────────────────────
// 'public' = no JWT required
// string[] = allowed roles
const ROUTE_ACCESS: Array<{
  prefix: RegExp;
  method?: string;
  access: 'public' | string[];
}> = [
  // Auth endpoints — always public
  { prefix: /^\/api\/auth\//, access: 'public' },

  // Doctor browsing — public GET only; mutations require doctor|admin
  { prefix: /^\/api\/doctors(\/[^/]+)?$/, method: 'GET', access: 'public' },
  { prefix: /^\/api\/doctors/, access: ['doctor', 'admin'] },

  // Patient service
  { prefix: /^\/api\/patients/, access: ['patient', 'admin'] },

  // Appointment service
  { prefix: /^\/api\/appointments/, access: ['patient', 'doctor', 'admin'] },

  // Telemedicine service
  { prefix: /^\/api\/telemedicine/, access: ['patient', 'doctor', 'admin'] },

  // Payment service
  { prefix: /^\/api\/payments\/webhook/, method: 'POST', access: 'public' }, // Stripe webhook
  { prefix: /^\/api\/payments/, access: ['patient', 'admin'] },

  // Notification service — internal only, but allow admin via gateway
  { prefix: /^\/api\/notifications/, access: ['admin'] },

  // AI Symptom Checker
  { prefix: /^\/api\/ai/, access: ['patient', 'admin'] },
];

// ── JWT Validation Middleware ──────────────────────────────────────────────
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // IMPORTANT: this middleware is mounted at /api, so req.path would be "/auth/..."
  // Use originalUrl to preserve the full route for the access matrix.
  const path = req.originalUrl.split('?')[0];
  const method = req.method;

  // Check if this route is public
  for (const rule of ROUTE_ACCESS) {
    if (rule.prefix.test(path)) {
      if (rule.method && rule.method !== method) continue;

      if (rule.access === 'public') {
        return next();
      }

      // Protected route — validate JWT
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or malformed Authorization header' });
        return;
      }

      const token = authHeader.slice(7);
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        logger.error('JWT_SECRET is not configured');
        res.status(500).json({ error: 'Server misconfiguration' });
        return;
      }

      try {
        const payload = jwt.verify(token, secret) as JwtPayload;
        req.user = payload;

        // Role authorisation
        const allowedRoles = rule.access as string[];
        if (!allowedRoles.includes(payload.role)) {
          res.status(403).json({ error: 'Insufficient role permissions' });
          return;
        }

        // Forward user info to upstream service via headers
        req.headers['x-user-id'] = payload.userId;
        req.headers['x-user-role'] = payload.role;
        req.headers['x-user-email'] = payload.email;
        req.headers['x-user-name'] = payload.name;

        return next();
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          res.status(401).json({ error: 'Token expired' });
          return;
        }
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
    }
  }

  // No matching rule — default deny (fail-secure)
  res.status(404).json({ error: 'Route not found' });
}
