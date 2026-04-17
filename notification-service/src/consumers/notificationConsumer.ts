import amqplib, { ConsumeMessage } from 'amqplib';
import { sendSMS } from '../services/smsService.js';
import * as emailService from '../services/emailService.js';

type ConnectedConnection = Awaited<ReturnType<typeof amqplib.connect>>;
type ConnectedChannel = Awaited<ReturnType<ConnectedConnection['createChannel']>>;

const QUEUE_NAME = 'notifications';
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;

interface NotificationEvent {
  event?: string;
  type?: string;
  timestamp?: string;
  [key: string]: unknown;
}

let connection: ConnectedConnection | null = null;
let channel: ConnectedChannel | null = null;
let consumerRunning = false;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const safeNotify = async (label: string, action: () => Promise<void>): Promise<void> => {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[notification-service] ${label} failed: ${message}`);
  }
};

const connectToRabbitMQ = async (): Promise<void> => {
  let attempt = 0;

  while (attempt < MAX_RETRY_ATTEMPTS) {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

      const conn = await amqplib.connect(url);
      const ch = await conn.createChannel();

      await ch.assertQueue(QUEUE_NAME, { durable: true });
      await ch.prefetch(1);

      connection = conn;
      channel = ch;

      connection.on('close', () => {
        console.warn('[notification-service] RabbitMQ connection closed');
        connection = null;
        channel = null;
        consumerRunning = false;
      });

      connection.on('error', (err: Error) => {
        console.error('[notification-service] RabbitMQ connection error:', err.message);
      });

      console.log('[notification-service] Connected to RabbitMQ');
      return;
    } catch (error) {
      attempt++;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[notification-service] RabbitMQ connection attempt ${attempt}/${MAX_RETRY_ATTEMPTS} failed: ${message}`);

      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  console.error('[notification-service] Failed to connect to RabbitMQ after multiple attempts');
};

// ── Event Handlers ──────────────────────────────────────────────────────────

const handleAppointmentBooked = async (event: NotificationEvent): Promise<void> => {
  const {
    appointmentId,
    doctorId,
    doctorName,
    patientName,
    patientEmail,
    patientPhone,
    scheduledAt,
    doctorEmail,
  } = event;

  console.log(`[notification-service] Processing appointment.booked for appointment ${appointmentId}`);

  if (patientPhone && typeof patientPhone === 'string') {
    await safeNotify('SMS appointment.booked', async () =>
      sendSMS(
        patientPhone,
        `Your appointment with Dr. ${doctorName} has been requested. We will confirm shortly.`
      )
    );
  }

  if (patientEmail && typeof patientEmail === 'string') {
    const scheduledDate = scheduledAt ? new Date(String(scheduledAt)).toLocaleDateString() : 'TBD';
    const scheduledTime = scheduledAt ? new Date(String(scheduledAt)).toLocaleTimeString() : 'TBD';
    await safeNotify('Email appointment.booked', async () =>
      emailService.sendAppointmentBookedEmail(
        patientEmail,
        String(patientName || 'Valued Patient'),
        String(doctorName || 'Doctor'),
        scheduledDate,
        scheduledTime
      )
    );
  }

  if (doctorId) {
    console.log(`[notification-service] Would send email to doctor ${doctorId} about new appointment`);
  }

  if (doctorEmail && typeof doctorEmail === 'string') {
    await safeNotify('Email doctor.new-appointment', async () =>
      emailService.sendDoctorNewAppointmentEmail(
        doctorEmail,
        String(patientName || 'Patient')
      )
    );
  }
};

const handleUserRegistered = async (event: NotificationEvent): Promise<void> => {
  const { userId, email, name, role } = event;

  console.log(`[notification-service] Processing user.registered for user ${String(userId || 'unknown')}`);

  if (!email || typeof email !== 'string') {
    return;
  }

  if (role === 'doctor') {
    await safeNotify('Email user.registered.doctor', async () =>
      emailService.sendDoctorRegistrationReceivedEmail(
        email,
        String(name || 'Doctor')
      )
    );
    return;
  }

  await safeNotify('Email user.registered.patient', async () =>
    emailService.sendPatientWelcomeEmail(
      email,
      String(name || 'Valued Patient')
    )
  );
};

const handleAppointmentConfirmed = async (event: NotificationEvent): Promise<void> => {
  const { appointmentId, patientEmail, patientPhone, doctorName, patientName } = event;

  console.log(`[notification-service] Processing appointment.confirmed for appointment ${appointmentId}`);

  if (patientPhone && typeof patientPhone === 'string') {
    await safeNotify('SMS appointment.confirmed', async () =>
      sendSMS(
        patientPhone,
        `Great! Dr. ${doctorName} has confirmed your appointment. Please complete payment to proceed.`
      )
    );
  }

  if (patientEmail && typeof patientEmail === 'string') {
    const paymentLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/${appointmentId}`;
    await safeNotify('Email appointment.confirmed', async () =>
      emailService.sendAppointmentConfirmedEmail(
        patientEmail,
        String(patientName || 'Valued Patient'),
        String(doctorName || 'Doctor'),
        paymentLink
      )
    );
  }
};

const handlePaymentConfirmed = async (event: NotificationEvent): Promise<void> => {
  const { appointmentId, patientEmail, patientPhone, amount, doctorName, patientName, scheduledAt } = event;

  console.log(`[notification-service] Processing payment.confirmed for appointment ${appointmentId}`);

  if (patientPhone && typeof patientPhone === 'string') {
    await safeNotify('SMS payment.confirmed', async () =>
      sendSMS(
        patientPhone,
        `Payment of $${amount} received! Your consultation with Dr. ${doctorName} is ready. Join the video call at the scheduled time.`
      )
    );
  }

  if (patientEmail && typeof patientEmail === 'string') {
    const scheduledDate = scheduledAt ? new Date(String(scheduledAt)).toLocaleDateString() : 'Soon';
    const fee = typeof amount === 'number' ? amount : 25.0;
    await safeNotify('Email payment.confirmed', async () =>
      emailService.sendPaymentConfirmedEmail(
        patientEmail,
        String(patientName || 'Valued Patient'),
        String(doctorName || 'Doctor'),
        fee,
        scheduledDate
      )
    );
  }
};

const handleConsultationCompleted = async (event: NotificationEvent): Promise<void> => {
  const { appointmentId, patientEmail, doctorName, patientName } = event;

  console.log(`[notification-service] Processing consultation.completed for appointment ${appointmentId}`);

  if (patientEmail && typeof patientEmail === 'string') {
    await safeNotify('Email consultation.completed', async () =>
      emailService.sendConsultationCompletedEmail(
        patientEmail,
        String(patientName || 'Valued Patient'),
        String(doctorName || 'Doctor')
      )
    );
  }
};

const handlePrescriptionIssued = async (event: NotificationEvent): Promise<void> => {
  const { appointmentId, patientEmail, doctorName, patientName } = event;

  console.log(`[notification-service] Processing prescription.issued for appointment ${appointmentId}`);

  if (patientEmail && typeof patientEmail === 'string') {
    await safeNotify('Email prescription.issued', async () =>
      emailService.sendPrescriptionIssuedEmail(
        patientEmail,
        String(patientName || 'Valued Patient'),
        String(doctorName || 'Doctor')
      )
    );
  }
};

const handleAppointmentCancelled = async (event: NotificationEvent): Promise<void> => {
  const {
    appointmentId,
    patientEmail,
    patientPhone,
    doctorEmail,
    doctorPhone,
    doctorName,
    patientName,
    scheduledAt,
  } = event;

  console.log(`[notification-service] Processing appointment.cancelled for appointment ${appointmentId}`);

  if (patientPhone && typeof patientPhone === 'string') {
    await safeNotify('SMS appointment.cancelled.patient', async () =>
      sendSMS(
        patientPhone,
        `Your appointment with Dr. ${doctorName} has been cancelled. You will receive a refund within 3-5 business days.`
      )
    );
  }

  if (doctorPhone && typeof doctorPhone === 'string') {
    await safeNotify('SMS appointment.cancelled.doctor', async () =>
      sendSMS(
        doctorPhone,
        `Appointment on ${scheduledAt ? new Date(String(scheduledAt)).toLocaleDateString() : 'scheduled date'} has been cancelled.`
      )
    );
  }

  if (patientEmail && typeof patientEmail === 'string') {
    await safeNotify('Email appointment.cancelled.patient', async () =>
      emailService.sendAppointmentCancelledEmail(
        patientEmail,
        String(patientName || 'Valued Patient'),
        scheduledAt ? new Date(String(scheduledAt)).toLocaleDateString() : 'N/A'
      )
    );
  }

  if (doctorEmail && typeof doctorEmail === 'string') {
    await safeNotify('Email appointment.cancelled.doctor', async () =>
      emailService.sendAppointmentCancelledEmail(
        doctorEmail,
        String(doctorName || 'Doctor'),
        scheduledAt ? new Date(String(scheduledAt)).toLocaleDateString() : 'N/A'
      )
    );
  }
};

const messageHandler = async (msg: ConsumeMessage | null): Promise<void> => {
  if (!msg) return;

  try {
    const content = msg.content.toString();
    const event: NotificationEvent = JSON.parse(content);

    const eventType = event.event || event.type;

    if (!eventType) {
      throw new Error('Invalid event payload: missing event/type field');
    }

    console.log(`[notification-service] Received event: ${eventType}`);

    switch (eventType) {
      case 'user.registered':
        await handleUserRegistered(event);
        break;

      case 'appointment.booked':
        await handleAppointmentBooked(event);
        break;

      case 'appointment.confirmed':
        await handleAppointmentConfirmed(event);
        break;

      case 'payment.confirmed':
        await handlePaymentConfirmed(event);
        break;

      case 'consultation.completed':
        await handleConsultationCompleted(event);
        break;

      case 'prescription.issued':
        await handlePrescriptionIssued(event);
        break;

      case 'appointment.cancelled':
        await handleAppointmentCancelled(event);
        break;

      default:
        console.warn(`[notification-service] Unknown event type: ${eventType}`);
    }

    if (channel) {
      channel.ack(msg);
    }
  } catch (error) {
    console.error(
      '[notification-service] Failed to process message:',
      error instanceof Error ? error.message : error
    );

    if (channel) {
      const isPermanentFailure =
        error instanceof SyntaxError ||
        (error instanceof Error && error.message.includes('Invalid event payload'));

      channel.nack(msg, false, !isPermanentFailure);
    }
  }
};

export const startConsumer = async (): Promise<void> => {
  try {
    await connectToRabbitMQ();

    if (!channel) {
      throw new Error('Channel not initialized');
    }

    await channel.consume(QUEUE_NAME, (msg: ConsumeMessage | null) => {
      void messageHandler(msg);
    });

    consumerRunning = true;
    console.log(`[notification-service] Started consuming from queue: ${QUEUE_NAME}`);
  } catch (error) {
    console.error('[notification-service] Failed to start consumer:', error instanceof Error ? error.message : error);
    throw error;
  }
};

export const isConsumerRunning = (): boolean => consumerRunning;

export const closeConsumer = async (): Promise<void> => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    consumerRunning = false;
    console.log('[notification-service] Consumer closed gracefully');
  } catch (error) {
    console.error('[notification-service] Error closing consumer:', error instanceof Error ? error.message : error);
  }
};

export default { startConsumer, isConsumerRunning, closeConsumer };
