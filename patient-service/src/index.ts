import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import patientRoutes from './routes/patientRoutes';
import { swaggerSpec } from './swagger';
import logger from './logger';
import { runSeeders } from './seeders';

const app = express();
const PORT = Number(process.env.PATIENT_SERVICE_PORT) || 3002;
const SERVICE_NAME = 'patient-service';

// Validate required env vars
['MONGODB_URI', 'JWT_SECRET'].forEach(
  (key) => {
    if (!process.env[key]) {
      logger.error(`Missing required environment variable: ${key}`);
      process.exit(1);
    }
  },
);

// Warn about optional env vars
['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].forEach(
  (key) => {
    if (!process.env[key]) {
      logger.warn(`Optional environment variable not set: ${key} — file uploads will be unavailable`);
    }
  },
);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10kb' }));
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === '/health',
  }),
);

// ── Swagger API Docs ───────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Patient Service API Docs',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  if (dbState === 1) {
    res.status(200).json({ status: 'ok', service: SERVICE_NAME });
  } else {
    res.status(503).json({ status: 'unhealthy', service: SERVICE_NAME, db: dbState });
  }
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/patients', patientRoutes);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Multer file size / type errors
  if (err.message.includes('File type not allowed') || err.message.includes('File too large')) {
    res.status(400).json({ error: err.message });
    return;
  }
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Database + Boot ────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`[${SERVICE_NAME}] MongoDB connected`);
    await runSeeders();

    app.listen(PORT, () => {
      logger.info(`[${SERVICE_NAME}] Running on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`[${SERVICE_NAME}] Failed to start: ${(err as Error).message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info(`[${SERVICE_NAME}] SIGTERM received — shutting down`);
  await mongoose.connection.close();
  process.exit(0);
});

if (process.env.NODE_ENV !== 'test') {
  void start();
}

export { app };
