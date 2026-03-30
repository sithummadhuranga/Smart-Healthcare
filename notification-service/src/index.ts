import 'dotenv/config';
import express, { Request, Response } from 'express';

const app = express();
const PORT = Number(process.env.NOTIFICATION_SERVICE_PORT) || 3007;
const SERVICE_NAME = 'notification-service';

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: SERVICE_NAME, consumer: 'stub' });
});

app.use((_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented yet — stub service' });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] RabbitMQ consumer will connect on startup (stub: not connected)`);
});
