// FILE: src/index.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import paymentRoutes from './routes/paymentRoutes';
import { handleWebhook } from './controllers/paymentController';
import { initializeDatabase } from './db/pool';
import { initializeRabbitMQ } from './services/rabbitmqPublisher';

const app = express();
const PORT = Number(process.env.PAYMENT_SERVICE_PORT) || 3006;
const SERVICE_NAME = 'payment-service';

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Payment Service API Docs',
    swaggerOptions: { persistAuthorization: true },
  })
);

app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: SERVICE_NAME });
});

app.use('/api/payments', paymentRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

const start = async (): Promise<void> => {
  try {
    await initializeDatabase();
    void initializeRabbitMQ();

    app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
      console.log(`[${SERVICE_NAME}] API docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to start`, error);
    process.exit(1);
  }
};

void start();