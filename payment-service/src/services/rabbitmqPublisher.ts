// FILE: src/services/rabbitmqPublisher.ts
import amqplib from 'amqplib';

type ConnectedConnection = Awaited<ReturnType<typeof amqplib.connect>>;
type ConnectedChannel = Awaited<ReturnType<ConnectedConnection['createChannel']>>;

const QUEUE_NAME = 'notifications';
const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 5_000;

let connection: ConnectedConnection | null = null;
let channel: ConnectedChannel | null = null;
let connectPromise: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let shuttingDown = false;
let warnedUnavailable = false;

const getRabbitmqUrl = (): string => process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

const getRabbitmqUrls = (): string[] => {
  const primary = getRabbitmqUrl();

  try {
    const parsed = new URL(primary);
    if (parsed.hostname === 'rabbitmq') {
      parsed.hostname = 'localhost';
      return [primary, parsed.toString()];
    }
  } catch {
    // keep primary only when URL parsing fails
  }

  return [primary];
};

const scheduleReconnect = (): void => {
  if (shuttingDown || reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectRabbitMQ().catch(() => undefined);
  }, RETRY_DELAY_MS);
};

const attachConnectionListeners = (activeConnection: ConnectedConnection): void => {
  activeConnection.on('close', () => {
    console.warn('[payment-service] RabbitMQ connection closed');
    connection = null;
    channel = null;
    scheduleReconnect();
  });

  activeConnection.on('error', (error: Error) => {
    console.warn('[payment-service] RabbitMQ connection error:', error.message);
  });
};

export const connectRabbitMQ = async (): Promise<void> => {
  if (connectPromise) {
    await connectPromise;
    return;
  }

  connectPromise = (async () => {
    if (connection && channel) {
      return;
    }

    const urls = getRabbitmqUrls();
    let lastError: unknown;
    let attempt = 0;

    while (attempt < MAX_ATTEMPTS && !shuttingDown) {
      for (const url of urls) {
        try {
          const activeConnection = await amqplib.connect(url);
          const activeChannel = await activeConnection.createChannel();

          await activeChannel.assertQueue(QUEUE_NAME, { durable: true });

          connection = activeConnection;
          channel = activeChannel;
          warnedUnavailable = false;

          attachConnectionListeners(activeConnection);
          console.log(`[payment-service] RabbitMQ connected and queue asserted via ${url}`);
          return;
        } catch (connectError) {
          lastError = connectError;
        }
      }

      attempt += 1;

      if (!warnedUnavailable) {
        console.warn('[payment-service] RabbitMQ unavailable, retrying in the background');
        warnedUnavailable = true;
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }

    console.warn('[payment-service] RabbitMQ unavailable, notifications will be skipped');

    if (lastError instanceof Error) {
      console.warn('[payment-service] Last RabbitMQ error:', lastError.message);
    }
  })().finally(() => {
    connectPromise = null;
  });

  await connectPromise;
};

export const publishEvent = async (eventType: string, data: Record<string, unknown>): Promise<void> => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }

    if (!channel) {
      console.warn(`[payment-service] RabbitMQ unavailable, skipping event ${eventType}`);
      scheduleReconnect();
      return;
    }

    const payload = {
      type: eventType,
      ...data,
      timestamp: new Date().toISOString(),
    };

    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
  } catch (error) {
    console.warn('[payment-service] Failed to publish event, skipping notification:', error);
  }
};

export const closeRabbitMQ = async (): Promise<void> => {
  shuttingDown = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

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

  channel = null;
  connection = null;
};

export const initializeRabbitMQ = async (): Promise<void> => {
  shuttingDown = false;
  void connectRabbitMQ().catch((error) => {
    console.warn('[payment-service] RabbitMQ initial connection deferred:', error);
  });
};