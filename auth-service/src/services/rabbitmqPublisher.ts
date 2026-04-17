import amqplib from 'amqplib';
import logger from '../logger';

type ConnectedConnection = Awaited<ReturnType<typeof amqplib.connect>>;
type ConnectedChannel = Awaited<ReturnType<ConnectedConnection['createChannel']>>;

const QUEUE_NAME = 'notifications';

let connection: ConnectedConnection | null = null;
let channel: ConnectedChannel | null = null;
let connectPromise: Promise<boolean> | null = null;

function getRabbitmqUrls(): string[] {
  const primary = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

  try {
    const parsed = new URL(primary);
    if (parsed.hostname === 'rabbitmq') {
      parsed.hostname = 'localhost';
      return [primary, parsed.toString()];
    }
  } catch {
    logger.warn('[auth-service] Invalid RABBITMQ_URL format, using configured value only');
  }

  return [primary];
}

function resetConnectionState(): void {
  connection = null;
  channel = null;
}

function attachConnectionListeners(activeConnection: ConnectedConnection): void {
  activeConnection.on('close', () => {
    logger.warn('[auth-service] RabbitMQ connection closed');
    resetConnectionState();
  });

  activeConnection.on('error', (error: Error) => {
    logger.warn(`[auth-service] RabbitMQ connection error: ${error.message}`);
    resetConnectionState();
  });
}

async function connectRabbitMQ(): Promise<boolean> {
  if (channel) {
    return true;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    let lastError: Error | null = null;

    for (const url of getRabbitmqUrls()) {
      try {
        const activeConnection = await amqplib.connect(url);
        const activeChannel = await activeConnection.createChannel();

        await activeChannel.assertQueue(QUEUE_NAME, { durable: true });

        connection = activeConnection;
        channel = activeChannel;
        attachConnectionListeners(activeConnection);

        logger.info(`[auth-service] RabbitMQ connected via ${url}`);
        return true;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    logger.warn(
      `[auth-service] RabbitMQ unavailable, registration emails will be skipped${
        lastError ? `: ${lastError.message}` : ''
      }`
    );
    return false;
  })().finally(() => {
    connectPromise = null;
  });

  return connectPromise;
}

export async function initializeRabbitMQ(): Promise<void> {
  await connectRabbitMQ();
}

export async function publishNotificationEvent(
  eventType: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const isConnected = channel ? true : await connectRabbitMQ();
    if (!isConnected || !channel) {
      return false;
    }

    const payload = {
      type: eventType,
      event: eventType,
      ...data,
      timestamp: new Date().toISOString(),
    };

    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[auth-service] Failed to publish ${eventType}: ${message}`);
    resetConnectionState();
    return false;
  }
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    await channel?.close();
  } catch {
    // ignore shutdown errors
  }

  try {
    await connection?.close();
  } catch {
    // ignore shutdown errors
  }

  resetConnectionState();
}