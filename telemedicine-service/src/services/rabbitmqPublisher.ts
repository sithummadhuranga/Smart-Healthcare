import amqp, { Channel, ChannelModel } from 'amqplib';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const QUEUE_NAME = 'notifications';

async function getChannel(): Promise<Channel> {
  if (channel !== null) {
    return channel;
  }

  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();
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
