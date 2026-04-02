import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import appointmentRoutes from './routes/appointmentRoutes';
import { pool } from './db/pool';
import { closeRabbitConnections } from './services/rabbitmqPublisher';

const app = express();
const PORT = Number(process.env.APPOINTMENT_SERVICE_PORT) || 3004;
const SERVICE_NAME = 'appointment-service';

app.use(express.json());
app.use(cors());

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
    await pool.query('SELECT 1');
    console.log(`[${SERVICE_NAME}] Connected to PostgreSQL`);

    app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
      console.log(`[${SERVICE_NAME}] API Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to start`, error);
    process.exit(1);
  }
}

const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
for (const signal of shutdownSignals) {
  process.on(signal, async () => {
    await closeRabbitConnections();
    await pool.end();
    process.exit(0);
  });
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}

export { app };
