import amqp, { Channel, ChannelModel } from 'amqplib';

const QUEUE_NAME = 'notifications';
let connection: ChannelModel | null = null;
let channel: Channel | null = null;

async function getChannel(): Promise<Channel> {
  if (channel) {
    return channel;
  }

  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL is not configured');
  }

  const newConnection = await amqp.connect(rabbitUrl);
  const newChannel = await newConnection.createChannel();
  await newChannel.assertQueue(QUEUE_NAME, { durable: true });

  connection = newConnection;
  channel = newChannel;

  connection.on('close', () => {
    channel = null;
    connection = null;
  });

  connection.on('error', () => {
    channel = null;
    connection = null;
  });

  return newChannel;
}

export async function publishNotificationEvent(payload: Record<string, unknown>): Promise<void> {
  const activeChannel = await getChannel();
  const message = Buffer.from(JSON.stringify(payload));
  activeChannel.sendToQueue(QUEUE_NAME, message, { persistent: true });
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
