import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import doctorRoutes from './routes/doctorRoutes';

const app = express();
const PORT = Number(process.env.DOCTOR_SERVICE_PORT) || 3003;
const SERVICE_NAME = 'doctor-service';
const MONGODB_URI = process.env.DOCTOR_MONGODB_URI || 'mongodb://localhost:27017/doctordb';

app.use(express.json());
app.use(cors());

// ── Swagger API Docs ────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Doctor Service API Docs',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: SERVICE_NAME });
});

app.use('/api/doctors', doctorRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

async function bootstrap(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[${SERVICE_NAME}] Connected to MongoDB`);

    app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
      console.log(`[${SERVICE_NAME}] API Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to start`, error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}

export { app };
