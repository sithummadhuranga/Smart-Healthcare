import twilio from 'twilio';

let client: ReturnType<typeof twilio> | null = null;

export function isSmsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
}

export function getSmsProviderStatus(): 'active' | 'degraded' {
  return isSmsConfigured() ? 'active' : 'degraded';
}

function getTwilioClient(): ReturnType<typeof twilio> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
  }

  if (!client) {
    client = twilio(accountSid, authToken);
  }

  return client;
}

export async function sendSMS(toPhoneNumber: string, message: string): Promise<void> {
  const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromPhoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured');
  }

  if (!toPhoneNumber || !message) {
    throw new Error('SMS payload missing recipient or message');
  }

  try {
    const twilioClient = getTwilioClient();
    const result = await twilioClient.messages.create({
      from: fromPhoneNumber,
      to: toPhoneNumber,
      body: message,
    });

    console.log(`[notification-service] SMS sent. sid=${result.sid}`);
  } catch (error) {
    console.error('[notification-service] Failed to send SMS', error);
    throw error;
  }
}
