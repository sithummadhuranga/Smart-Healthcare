import 'dotenv/config';
import express, { Request, Response } from 'express';

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

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: SERVICE_NAME });
});

app.use((_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented yet — stub service' });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
});
