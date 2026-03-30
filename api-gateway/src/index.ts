import 'dotenv/config';
import express, { Request, Response } from 'express';

const app = express();
const PORT = Number(process.env.API_GATEWAY_PORT) || 3000;
const SERVICE_NAME = 'api-gateway';

app.use(express.json());

// Health check — required by Docker healthcheck and Kubernetes livenessProbe
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: SERVICE_NAME });
});

// STUB — All routes return 501 until proxy middleware is wired up (Task M1-T4)
app.use((_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Not implemented yet — stub service',
    hint: 'Implement JWT middleware + proxy routing in src/middleware/ and src/routes/ (Task M1-T4)',
  });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
});
