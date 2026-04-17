import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { authenticate } from './middleware/authMiddleware';
import logger from './logger';

const app = express();
const PORT = Number(process.env.API_GATEWAY_PORT) || 3000;
const SERVICE_NAME = 'api-gateway';

// ── Trust proxy (needed when behind Nginx / load balancer) ─────────────────
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, Postman)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
  }),
);

// ── HTTP request logging ─────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === '/health',
  }),
);

// ── Global rate limiter ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Stricter limit for auth endpoints to slow brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
});

// Apply strict limiter only to credential-entry endpoints.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', globalLimiter);

// ── Health check (no auth, no rate-limit) ─────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: SERVICE_NAME });
});

// ── Swagger Doc Index (service links) ───────────────────────────────────────
app.get('/api-docs', (_req: Request, res: Response) => {
  const internal = {
    auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    patient: process.env.PATIENT_SERVICE_URL || 'http://patient-service:3002',
    doctor: process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3003',
    appointment: process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3004',
    telemedicine: process.env.TELEMEDICINE_SERVICE_URL || 'http://telemedicine-service:3005',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3006',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3007',
    aiSymptom: process.env.AI_SERVICE_URL || 'http://ai-symptom-service:8000',
  };

  const docs = {
    gateway: {
      health: '/health',
    },
    services: {
      auth: {
        gatewayUrl: '/api-docs/auth',
        gatewayJson: '/api-docs/auth.json',
        internalUrl: `${internal.auth}/api-docs`,
        internalJson: `${internal.auth}/api-docs.json`,
        hostUrl: 'http://127.0.0.1:3001/api-docs',
        hostJson: 'http://127.0.0.1:3001/api-docs.json',
      },
      patient: {
        gatewayUrl: '/api-docs/patient',
        gatewayJson: '/api-docs/patient.json',
        internalUrl: `${internal.patient}/api-docs`,
        internalJson: `${internal.patient}/api-docs.json`,
        hostUrl: 'http://127.0.0.1:3002/api-docs',
        hostJson: 'http://127.0.0.1:3002/api-docs.json',
      },
      doctor: {
        internalUrl: `${internal.doctor}/api-docs`,
        internalJson: `${internal.doctor}/api-docs.json`,
        hostUrl: 'http://127.0.0.1:3003/api-docs',
        hostJson: 'http://127.0.0.1:3003/api-docs.json',
      },
      appointment: {
        internalUrl: `${internal.appointment}/api-docs`,
        internalJson: `${internal.appointment}/api-docs.json`,
        hostUrl: 'http://127.0.0.1:3004/api-docs',
        hostJson: 'http://127.0.0.1:3004/api-docs.json',
      },
      telemedicine: {
        internalUrl: `${internal.telemedicine}/api-docs`,
        internalJson: `${internal.telemedicine}/api-docs.json`,
        hostUrl: 'http://127.0.0.1:3005/api-docs',
        hostJson: 'http://127.0.0.1:3005/api-docs.json',
      },
      payment: {
        internalUrl: `${internal.payment}/api-docs`,
        internalJson: `${internal.payment}/api-docs.json`,
        hostUrl: 'http://127.0.0.1:3006/api-docs',
        hostJson: 'http://127.0.0.1:3006/api-docs.json',
      },
      notification: {
        internalUrl: `${internal.notification}/api-docs`,
        internalJson: `${internal.notification}/api-docs.json`,
        hostUrl: 'http://127.0.0.1:3007/api-docs',
        hostJson: 'http://127.0.0.1:3007/api-docs.json',
      },
      aiSymptom: {
        internalUrl: `${internal.aiSymptom}/docs`,
        internalJson: `${internal.aiSymptom}/openapi.json`,
        hostUrl: 'http://127.0.0.1:8000/docs',
        hostJson: 'http://127.0.0.1:8000/openapi.json',
      },
    },
  };
  res.status(200).json(docs);
});

// ── Gateway Swagger passthrough for Member 1 services ───────────────────────
app.use(
  '/api-docs/auth',
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: () => '/api-docs',
    on: {
      error: (err, _req, res) => {
        logger.error(`Proxy error → ${process.env.AUTH_SERVICE_URL}: ${(err as Error).message}`);
        (res as Response).status(502).json({ error: 'Auth docs unavailable' });
      },
    },
  }) as unknown as express.RequestHandler,
);

app.use(
  '/api-docs/auth.json',
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: () => '/api-docs.json',
    on: {
      error: (err, _req, res) => {
        logger.error(`Proxy error → ${process.env.AUTH_SERVICE_URL}: ${(err as Error).message}`);
        (res as Response).status(502).json({ error: 'Auth docs unavailable' });
      },
    },
  }) as unknown as express.RequestHandler,
);

app.use(
  '/api-docs/patient',
  createProxyMiddleware({
    target: process.env.PATIENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: () => '/api-docs',
    on: {
      error: (err, _req, res) => {
        logger.error(`Proxy error → ${process.env.PATIENT_SERVICE_URL}: ${(err as Error).message}`);
        (res as Response).status(502).json({ error: 'Patient docs unavailable' });
      },
    },
  }) as unknown as express.RequestHandler,
);

app.use(
  '/api-docs/patient.json',
  createProxyMiddleware({
    target: process.env.PATIENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: () => '/api-docs.json',
    on: {
      error: (err, _req, res) => {
        logger.error(`Proxy error → ${process.env.PATIENT_SERVICE_URL}: ${(err as Error).message}`);
        (res as Response).status(502).json({ error: 'Patient docs unavailable' });
      },
    },
  }) as unknown as express.RequestHandler,
);

// ── JWT Authentication & Role Guard (runs before every /api/* proxy) ──────────
app.use('/api', authenticate);

// ── Proxy builder ─────────────────────────────────────────────────────────────
function proxy(target: string | undefined, pathPrefix: string): express.RequestHandler {
  if (!target) {
    logger.error(`Proxy target for ${pathPrefix} is not configured`);
    return (_req: Request, res: Response) =>
      res.status(503).json({ error: `Upstream service not configured: ${pathPrefix}` });
  }

  const opts: Options = {
    target,
    changeOrigin: true,
    // Keep full route (e.g. /api/auth/login) when forwarding to upstream services.
    // Without this, Express mount paths strip prefixes and upstream routes return 404.
    pathRewrite: (_path, req) => (req as Request).originalUrl,
    on: {
      error: (err, _req, res) => {
        logger.error(`Proxy error → ${target}: ${(err as Error).message}`);
        (res as Response).status(502).json({ error: 'Upstream service unavailable' });
      },
    },
  };
  return createProxyMiddleware(opts) as unknown as express.RequestHandler;
}

// ── Route table ───────────────────────────────────────────────────────────────
app.use('/api/auth',          proxy(process.env.AUTH_SERVICE_URL,          '/api/auth'));
app.use('/api/patients',      proxy(process.env.PATIENT_SERVICE_URL,       '/api/patients'));
app.use('/api/doctors',       proxy(process.env.DOCTOR_SERVICE_URL,        '/api/doctors'));
app.use('/api/appointments',  proxy(process.env.APPOINTMENT_SERVICE_URL,   '/api/appointments'));
app.use('/api/telemedicine',  proxy(process.env.TELEMEDICINE_SERVICE_URL,  '/api/telemedicine'));
app.use('/api/payments',      proxy(process.env.PAYMENT_SERVICE_URL,       '/api/payments'));
app.use('/api/notifications', proxy(process.env.NOTIFICATION_SERVICE_URL,  '/api/notifications'));
app.use('/api/ai',            proxy(process.env.AI_SERVICE_URL,            '/api/ai'));

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
function start(): void {
  app.listen(PORT, () => {
    logger.info(`[${SERVICE_NAME}] Running on port ${PORT}`);
    logger.info(`[${SERVICE_NAME}] Upstream services configured:`);
    logger.info(`  AUTH        → ${process.env.AUTH_SERVICE_URL}`);
    logger.info(`  PATIENT     → ${process.env.PATIENT_SERVICE_URL}`);
    logger.info(`  DOCTOR      → ${process.env.DOCTOR_SERVICE_URL}`);
    logger.info(`  APPOINTMENT → ${process.env.APPOINTMENT_SERVICE_URL}`);
    logger.info(`  TELEMEDICINE→ ${process.env.TELEMEDICINE_SERVICE_URL}`);
    logger.info(`  PAYMENT     → ${process.env.PAYMENT_SERVICE_URL}`);
    logger.info(`  NOTIFICATION→ ${process.env.NOTIFICATION_SERVICE_URL}`);
    logger.info(`  AI          → ${process.env.AI_SERVICE_URL}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
