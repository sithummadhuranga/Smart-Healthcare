import 'dotenv/config';
import express, { Request, Response } from 'express';
import { closeConsumer, isConsumerRunning, startConsumer } from './consumers/notificationConsumer';
import {
  getEmailProviderIssue,
  getEmailProviderStatus,
  isEmailConfigured,
} from './services/emailService';
import { getSmsProviderStatus, isSmsConfigured } from './services/smsService';

const app = express();
const PORT = Number(process.env.NOTIFICATION_SERVICE_PORT) || 3007;
const SERVICE_NAME = 'notification-service';

function sendHealth(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    service: SERVICE_NAME,
    consumer: isConsumerRunning() ? 'active' : 'initializing',
    email: getEmailProviderStatus(),
    sms: getSmsProviderStatus(),
  });
}

app.get('/health', sendHealth);
app.get('/api/notifications/health', sendHealth);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
  console.log(
    `[${SERVICE_NAME}] Email provider: ${isEmailConfigured() ? 'configured' : getEmailProviderIssue() || 'misconfigured'}`
  );
  console.log(`[${SERVICE_NAME}] SMS provider: ${isSmsConfigured() ? 'configured' : 'missing Twilio credentials'}`);
});

void startConsumer().catch((error) => {
  console.error(`[${SERVICE_NAME}] Failed to start RabbitMQ consumer`, error);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[${SERVICE_NAME}] Received ${signal}. Shutting down...`);
  await closeConsumer();
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
