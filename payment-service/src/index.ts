import 'dotenv/config';
import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

const app = express();
const PORT = Number(process.env.PAYMENT_SERVICE_PORT) || 3006;
const SERVICE_NAME = 'payment-service';

// IMPORTANT: /api/payments/webhook MUST use raw body — register BEFORE express.json()
// See api-contracts.md §4.6 for the critical Stripe webhook implementation note.
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (_req: Request, res: Response) => {
    res.status(501).json({ error: 'Not implemented yet — stub service' });
  },
);

app.use(express.json());

// ── Swagger API Docs ────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Payment Service API Docs',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: SERVICE_NAME });
});

app.use((_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented yet — stub service' });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] API Docs: http://localhost:${PORT}/api-docs`);
});
