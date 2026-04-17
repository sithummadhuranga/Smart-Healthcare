import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import telemedicineRoutes from './routes/telemedicineRoutes';
import { closeRabbitConnections } from './services/rabbitmqPublisher';

const app = express();
const PORT = Number(process.env.TELEMEDICINE_SERVICE_PORT) || 3005;
const SERVICE_NAME = 'telemedicine-service';

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost')
  .split(',')
  .map((origin) => origin.trim());

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Telemedicine Service API Docs',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: SERVICE_NAME });
});

app.use('/api/telemedicine', telemedicineRoutes);

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in (err as object)) {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  next(err);
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] API Docs: http://localhost:${PORT}/api-docs`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[${SERVICE_NAME}] Received ${signal}. Shutting down...`);
  await closeRabbitConnections();
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
