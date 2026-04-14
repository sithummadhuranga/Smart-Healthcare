import amqp from 'amqplib';

type ConnectedConnection = Awaited<ReturnType<typeof amqp.connect>>;
type ConnectedChannel = Awaited<ReturnType<ConnectedConnection['createChannel']>>;

let connection: ConnectedConnection | null = null;
let channel: ConnectedChannel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const QUEUE_NAME = 'notifications';

async function getChannel(): Promise<ConnectedChannel> {
  if (channel !== null) {
    return channel;
  }

  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();

  connection = conn;
  channel = ch;

  connection.on('close', () => {
    channel = null;
    connection = null;
  });

  connection.on('error', () => {
    channel = null;
    connection = null;
  });

  await channel.assertQueue(QUEUE_NAME, { durable: true });
  return channel;
}

export async function publishNotificationEvent(payload: Record<string, unknown>): Promise<void> {
  const ch = await getChannel();
  const body = Buffer.from(JSON.stringify(payload));
  ch.sendToQueue(QUEUE_NAME, body, { persistent: true });
}

export async function closeRabbitConnections(): Promise<void> {
  if (channel) {
    await channel.close();
    channel = null;
  }

  if (connection) {
    await connection.close();
    connection = null;
  }
}
