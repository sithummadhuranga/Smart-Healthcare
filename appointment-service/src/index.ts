import 'dotenv/config';
import express, { Request, Response } from 'express';

const app = express();
const PORT = Number(process.env.APPOINTMENT_SERVICE_PORT) || 3004;
const SERVICE_NAME = 'appointment-service';

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
