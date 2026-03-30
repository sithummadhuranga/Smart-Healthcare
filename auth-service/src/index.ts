import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/authRoutes';
import { swaggerSpec } from './swagger';
import logger from './logger';

const app = express();
const PORT = Number(process.env.AUTH_SERVICE_PORT) || 3001;
const SERVICE_NAME = 'auth-service';

// Fail fast if critical secrets are missing
['JWT_SECRET', 'JWT_REFRESH_SECRET', 'AUTH_MONGODB_URI'].forEach((key) => {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

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
app.use(cookieParser());
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === '/health',
  }),
);

// ── Swagger API Docs ───────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Auth Service API Docs',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── Health check ───────────────────────────────────────────────────────────────
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Service health check
 *     description: Returns service status and MongoDB connection state. Used by Docker and Kubernetes liveness probes.
 *     responses:
 *       200:
 *         description: Service healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: auth-service
 *       503:
 *         description: Service unhealthy (database not connected)
 */
app.get('/health', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  if (dbState === 1) {
    res.status(200).json({ status: 'ok', service: SERVICE_NAME });
  } else {
    res.status(503).json({ status: 'unhealthy', service: SERVICE_NAME, db: dbState });
  }
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Database + Boot ────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    await mongoose.connect(process.env.AUTH_MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`[${SERVICE_NAME}] MongoDB connected`);

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

start();
