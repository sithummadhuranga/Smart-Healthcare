import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import appointmentRoutes from './routes/appointmentRoutes';
import { initializeDatabase, pool } from './db/pool';
import { closeRabbitConnections } from './services/rabbitmqPublisher';

const app = express();
const PORT = Number(process.env.APPOINTMENT_SERVICE_PORT) || 3004;
const SERVICE_NAME = 'appointment-service';

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

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
  }),
);

// ── Swagger API Docs ────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Appointment Service API Docs',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: SERVICE_NAME });
});

app.use('/api/appointments', appointmentRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

async function bootstrap(): Promise<void> {
  try {
    await initializeDatabase();
    console.log(`[${SERVICE_NAME}] PostgreSQL schema verified`);

    app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
      console.log(`[${SERVICE_NAME}] API Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to start`, error);
    process.exit(1);
  }
}

function registerShutdownHandlers(): void {
  const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of shutdownSignals) {
    process.on(signal, async () => {
      await closeRabbitConnections();
      await pool.end();
      process.exit(0);
    });
  }
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  registerShutdownHandlers();
  void bootstrap();
}

export { app };
