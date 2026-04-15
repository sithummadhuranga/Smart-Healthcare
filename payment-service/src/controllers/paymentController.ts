// FILE: src/controllers/paymentController.ts
import axios, { AxiosError } from 'axios';
import { Response } from 'express';
import { PoolClient } from 'pg';
import Stripe from 'stripe';
import { ensureDatabaseConnection, pool } from '../db/pool';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { publishEvent } from '../services/rabbitmqPublisher';

type AppointmentDetails = {
  patientId?: string;
  patient_id?: string;
  doctorId?: string;
  doctor_id?: string;
  status?: string;
};

type DoctorDetails = {
  consultationFee?: number | string;
  consultation_fee?: number | string;
};

type PaymentRow = {
  id: string;
  appointment_id: string;
  patient_id: string;
  amount: string;
  currency: string | null;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type PaymentWebhookEventRow = {
  event_id: string;
  event_type: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  stripe_payment_intent_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_CONSULTATION_FEE = 25.0;
const DEFAULT_CURRENCY = 'usd';
const WEBHOOK_PROCESSING_STATUS = 'PROCESSING';
const WEBHOOK_COMPLETED_STATUS = 'COMPLETED';
const WEBHOOK_FAILED_STATUS = 'FAILED';

let stripeClient: Stripe | null = null;

const getStripeClient = (): Stripe => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('[payment-service] STRIPE_SECRET_KEY is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

const getServiceUrl = (name: string, fallback: string): string => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
};

const getNumericValue = (value: number | string | null | undefined, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const pickValue = (record: Record<string, unknown>, keys: string[]): string | number | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) {
      return value as string | number;
    }
  }

  return undefined;
};

const formatPayment = (row: PaymentRow) => ({
  id: row.id,
  appointmentId: row.appointment_id,
  patientId: row.patient_id,
  amount: getNumericValue(row.amount),
  currency: row.currency || DEFAULT_CURRENCY,
  paymentMethod: row.payment_method,
  status: row.status,
  transactionId: row.stripe_charge_id || row.stripe_payment_intent_id,
  stripePaymentIntentId: row.stripe_payment_intent_id,
  stripeChargeId: row.stripe_charge_id,
  createdAt: row.created_at,
});

const runWithClient = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
};

const lockAppointment = async (client: PoolClient, appointmentId: string): Promise<void> => {
  await client.query('SELECT pg_advisory_lock(hashtext($1))', [appointmentId]);
};

const unlockAppointment = async (client: PoolClient, appointmentId: string): Promise<void> => {
  try {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [appointmentId]);
  } catch {
    // ignore unlock errors during shutdown/error handling
  }
};

const getStripeIdempotencyKey = (appointmentId: string, patientId: string, paymentRowId: string): string =>
  `payment-intent:${appointmentId}:${patientId}:${paymentRowId}`;

const readCompletedPayment = async (client: PoolClient, appointmentId: string): Promise<PaymentRow | null> => {
  const result = await client.query<PaymentRow>(
    `SELECT *
     FROM payments
     WHERE appointment_id = $1 AND status = 'COMPLETED'
     ORDER BY created_at DESC
     LIMIT 1`,
    [appointmentId]
  );

  return result.rows[0] ?? null;
};

const readLatestPendingPayment = async (client: PoolClient, appointmentId: string): Promise<PaymentRow | null> => {
  const result = await client.query<PaymentRow>(
    `SELECT *
     FROM payments
     WHERE appointment_id = $1 AND status = 'PENDING'
     ORDER BY created_at DESC
     LIMIT 1`,
    [appointmentId]
  );

  return result.rows[0] ?? null;
};

const createPendingPaymentRow = async (
  client: PoolClient,
  appointmentId: string,
  patientId: string,
  amount: number
): Promise<PaymentRow> => {
  const result = await client.query<PaymentRow>(
    `INSERT INTO payments (
      appointment_id,
      patient_id,
      amount,
      currency,
      status
    )
    VALUES ($1, $2, $3, $4, 'PENDING')
    RETURNING *`,
    [appointmentId, patientId, amount.toFixed(2), DEFAULT_CURRENCY]
  );

  return result.rows[0];
};

const updatePaymentIntentRow = async (
  client: PoolClient,
  paymentRowId: string,
  amount: number,
  paymentIntentId: string,
  currency: string,
  paymentMethod: string | null
): Promise<void> => {
  await client.query(
    `UPDATE payments
     SET amount = $1,
         currency = $2,
         payment_method = $3,
         stripe_payment_intent_id = $4,
         status = 'PENDING'
     WHERE id = $5`,
    [amount.toFixed(2), currency, paymentMethod, paymentIntentId, paymentRowId]
  );
};

const readWebhookEvent = async (client: PoolClient, eventId: string): Promise<PaymentWebhookEventRow | null> => {
  const result = await client.query<PaymentWebhookEventRow>(
    `SELECT *
     FROM payment_webhook_events
     WHERE event_id = $1
     LIMIT 1`,
    [eventId]
  );

  return result.rows[0] ?? null;
};

const upsertWebhookEventStatus = async (
  client: PoolClient,
  eventId: string,
  eventType: string,
  stripePaymentIntentId: string | null,
  status: PaymentWebhookEventRow['status'],
  lastError: string | null = null
): Promise<void> => {
  await client.query(
    `INSERT INTO payment_webhook_events (
      event_id,
      event_type,
      stripe_payment_intent_id,
      status,
      last_error
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (event_id) DO UPDATE
    SET event_type = EXCLUDED.event_type,
        stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
        status = EXCLUDED.status,
        last_error = EXCLUDED.last_error`,
    [eventId, eventType, stripePaymentIntentId, status, lastError]
  );
};

const buildAxiosErrorResponse = (error: unknown, defaultMessage: string): { status: number; message: string } => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;

    if (!axiosError.response) {
      return { status: 503, message: defaultMessage };
    }

    const status = axiosError.response.status;
    const message = axiosError.response.data?.error || axiosError.response.data?.message || defaultMessage;

    if (status >= 500) {
      return { status: 503, message: defaultMessage };
    }

    return { status, message };
  }

  return { status: 500, message: defaultMessage };
};

const getStripeErrorResponse = (
  error: unknown,
  fallbackMessage: string
): { status: number; message: string; code?: string } | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const stripeLike = error as {
    message?: unknown;
    code?: unknown;
    statusCode?: unknown;
    type?: unknown;
    raw?: { message?: unknown; code?: unknown };
  };

  const type = typeof stripeLike.type === 'string' ? stripeLike.type : '';
  if (!type.toLowerCase().includes('stripe')) {
    return null;
  }

  const messageFromRaw = typeof stripeLike.raw?.message === 'string' ? stripeLike.raw.message : '';
  const messageFromTop = typeof stripeLike.message === 'string' ? stripeLike.message : '';
  const codeFromRaw = typeof stripeLike.raw?.code === 'string' ? stripeLike.raw.code : undefined;
  const codeFromTop = typeof stripeLike.code === 'string' ? stripeLike.code : undefined;
  const statusCode = typeof stripeLike.statusCode === 'number' ? stripeLike.statusCode : 502;

  return {
    status: statusCode,
    message: messageFromRaw || messageFromTop || fallbackMessage,
    code: codeFromRaw || codeFromTop,
  };
};

const fetchAppointment = async (appointmentId: string, authorization?: string): Promise<AppointmentDetails> => {
  const appointmentServiceUrl = getServiceUrl('APPOINTMENT_SERVICE_URL', 'http://appointment-service:3004');

  try {
    const response = await axios.get(`${appointmentServiceUrl}/api/appointments/${encodeURIComponent(appointmentId)}`, {
      headers: authorization ? { Authorization: authorization } : {},
      timeout: 5_000,
    });

    return response.data as AppointmentDetails;
  } catch (error) {
    const response = buildAxiosErrorResponse(error, 'Unable to reach appointment service');

    if (response.status === 503) {
      throw new Error('APPOINTMENT_SERVICE_UNAVAILABLE');
    }

    const wrapped = new Error(response.message);
    (wrapped as Error & { status?: number }).status = response.status;
    throw wrapped;
  }
};

const fetchConsultationFee = async (doctorId: string): Promise<number> => {
  const doctorServiceUrl = getServiceUrl('DOCTOR_SERVICE_URL', 'http://doctor-service:3003');

  try {
    const response = await axios.get(`${doctorServiceUrl}/api/doctors/${encodeURIComponent(doctorId)}`, {
      timeout: 5_000,
    });

    const doctor = response.data as DoctorDetails;
    const feeValue = pickValue(doctor as Record<string, unknown>, ['consultationFee', 'consultation_fee']);

    return getNumericValue(feeValue, DEFAULT_CONSULTATION_FEE);
  } catch (error) {
    const response = buildAxiosErrorResponse(error, 'Unable to reach doctor service');

    if (response.status === 404) {
      throw new Error('DOCTOR_NOT_FOUND');
    }

    console.warn('[payment-service] Doctor service unavailable, using default consultation fee');
    return DEFAULT_CONSULTATION_FEE;
  }
};

const createPaymentRecord = async (
  appointmentId: string,
  patientId: string,
  amount: number,
  paymentIntentId: string
): Promise<PaymentRow> => {
  const result = await pool.query<PaymentRow>(
    `INSERT INTO payments (
      appointment_id,
      patient_id,
      amount,
      currency,
      stripe_payment_intent_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, 'PENDING')
    RETURNING *`,
    [appointmentId, patientId, amount.toFixed(2), DEFAULT_CURRENCY, paymentIntentId]
  );

  return result.rows[0];
};

const ensureDatabaseReady = async (res: Response): Promise<boolean> => {
  const ready = await ensureDatabaseConnection();

  if (!ready) {
    res.status(503).json({ error: 'Payment database is unavailable' });
    return false;
  }

  return true;
};

export const createPaymentIntent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureDatabaseReady(res))) {
      return;
    }

    const { appointmentId } = req.body as { appointmentId?: string };
    const user = req.user;

    if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.trim().length === 0) {
      res.status(400).json({ error: 'appointmentId is required' });
      return;
    }

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const appointment = await fetchAppointment(appointmentId, req.headers.authorization);
    const appointmentPatientId = appointment.patientId || appointment.patient_id;
    const appointmentDoctorId = appointment.doctorId || appointment.doctor_id;
    const appointmentStatus = String(appointment.status || '').toUpperCase();

    if (!appointmentPatientId || !appointmentDoctorId) {
      res.status(502).json({ error: 'Appointment service returned incomplete appointment details' });
      return;
    }

    if (appointmentPatientId !== user.userId) {
      res.status(403).json({ error: 'Access denied: this appointment does not belong to you' });
      return;
    }

    if (appointmentStatus !== 'CONFIRMED') {
      res.status(400).json({ error: 'Appointment must be CONFIRMED before payment' });
      return;
    }

    const stripe = getStripeClient();
    const consultationFee = await fetchConsultationFee(appointmentDoctorId);
    const result = await runWithClient(async (client) => {
      await lockAppointment(client, appointmentId);

      try {
        const completedPayment = await readCompletedPayment(client, appointmentId);

        if (completedPayment) {
          return {
            status: 'completed' as const,
            payment: completedPayment,
          };
        }

        const pendingPayment = await readLatestPendingPayment(client, appointmentId);
        const targetPayment = pendingPayment ?? (await createPendingPaymentRow(client, appointmentId, user.userId, consultationFee));

        if (targetPayment.stripe_payment_intent_id) {
          const existingIntent = await stripe.paymentIntents.retrieve(targetPayment.stripe_payment_intent_id);

          if (!existingIntent.client_secret) {
            throw new Error('Stripe PaymentIntent is missing client secret');
          }

          return {
            status: 'existing' as const,
            payment: targetPayment,
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
            amount: existingIntent.amount,
            currency: existingIntent.currency,
          };
        }

        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: Math.round(consultationFee * 100),
            currency: DEFAULT_CURRENCY,
            metadata: {
              appointmentId,
              patientId: user.userId,
              paymentId: targetPayment.id,
            },
          },
          {
            idempotencyKey: getStripeIdempotencyKey(appointmentId, user.userId, targetPayment.id),
          }
        );

        if (!paymentIntent.client_secret) {
          throw new Error('Stripe PaymentIntent is missing client secret');
        }

        const paymentMethod = paymentIntent.payment_method_types?.[0] || null;

        await updatePaymentIntentRow(
          client,
          targetPayment.id,
          consultationFee,
          paymentIntent.id,
          paymentIntent.currency || DEFAULT_CURRENCY,
          paymentMethod
        );

        return {
          status: 'created' as const,
          payment: targetPayment,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          paymentMethod,
        };
      } finally {
        await unlockAppointment(client, appointmentId);
      }
    });

    if (result.status === 'completed') {
      res.status(409).json({
        error: 'Payment has already been completed for this appointment',
        payment: formatPayment(result.payment),
      });
      return;
    }

    res.status(201).json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      amount: result.amount,
      currency: result.currency,
      paymentMethod: result.paymentMethod || null,
      paymentId: result.payment.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'APPOINTMENT_SERVICE_UNAVAILABLE') {
      res.status(503).json({ error: 'Appointment service is unavailable' });
      return;
    }

    if (error instanceof Error && error.message === 'DOCTOR_NOT_FOUND') {
      res.status(404).json({ error: 'Doctor not found for this appointment' });
      return;
    }

    const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
    if (typeof status === 'number') {
      const message = error instanceof Error ? error.message : 'Request failed';
      res.status(status).json({ error: message });
      return;
    }

    const stripeError = getStripeErrorResponse(error, 'Stripe rejected the payment request');
    if (stripeError) {
      console.warn('[payment-service] Stripe createPaymentIntent error', {
        code: stripeError.code,
        status: stripeError.status,
        message: stripeError.message,
      });
      res.status(stripeError.status).json({
        error: stripeError.message,
        code: stripeError.code,
      });
      return;
    }

    console.error('[payment-service] createPaymentIntent failed', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

export const handleWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureDatabaseReady(res))) {
      return;
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = getStripeClient();

    if (!webhookSecret) {
      res.status(500).json({ error: 'Stripe webhook secret is not configured' });
      return;
    }

    let event: Stripe.Event;

    if (typeof sig !== 'string') {
      res.status(400).json({ error: 'Missing Stripe signature header' });
      return;
    }

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid Stripe webhook signature';
      res.status(400).json({
        error: 'Stripe webhook signature verification failed',
        details: message,
      });
      return;
    }

    console.log(`[payment-service] Stripe webhook received eventId=${event.id} type=${event.type}`);

    const supportedPaymentEvent =
      event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed'
        ? (event.data.object as Stripe.PaymentIntent)
        : null;
    const stripePaymentIntentId = supportedPaymentEvent?.id ?? null;

    await runWithClient(async (client) => {
      await lockAppointment(client, event.id);

      try {
        const existingWebhookEvent = await readWebhookEvent(client, event.id);

        if (existingWebhookEvent?.status === WEBHOOK_COMPLETED_STATUS) {
          return;
        }

        await upsertWebhookEventStatus(client, event.id, event.type, stripePaymentIntentId, WEBHOOK_PROCESSING_STATUS);

        if (event.type === 'payment_intent.succeeded') {
          if (!supportedPaymentEvent) {
            throw new Error('Unexpected webhook payload for payment_intent.succeeded');
          }

          const appointmentId = supportedPaymentEvent.metadata?.appointmentId;
          const patientId = supportedPaymentEvent.metadata?.patientId;
          const paymentMethod = supportedPaymentEvent.payment_method_types?.[0] || null;
          const stripeChargeId = typeof supportedPaymentEvent.latest_charge === 'string'
            ? supportedPaymentEvent.latest_charge
            : supportedPaymentEvent.latest_charge
              ? String(supportedPaymentEvent.latest_charge)
              : null;

          if (!appointmentId || !patientId) {
            throw new Error('PaymentIntent metadata is incomplete');
          }

          await client.query(
            `UPDATE payments
             SET status = 'COMPLETED',
                 payment_method = $3,
                 stripe_charge_id = $1
             WHERE stripe_payment_intent_id = $2`,
            [stripeChargeId, stripePaymentIntentId, paymentMethod]
          );

          const paymentRecordResult = await client.query<PaymentRow>(
            `SELECT *
             FROM payments
             WHERE stripe_payment_intent_id = $1
             LIMIT 1`,
            [stripePaymentIntentId]
          );

          if (paymentRecordResult.rows.length === 0) {
            const inserted = await client.query(
              `INSERT INTO payments (
                appointment_id,
                patient_id,
                amount,
                currency,
                payment_method,
                stripe_payment_intent_id,
                stripe_charge_id,
                status
              )
              SELECT $1, $2, $3, $4, $5, $6, $7, 'COMPLETED'
              WHERE NOT EXISTS (
                SELECT 1 FROM payments WHERE stripe_payment_intent_id = $6
              )
              RETURNING id`,
              [
                appointmentId,
                patientId,
                (supportedPaymentEvent.amount / 100).toFixed(2),
                supportedPaymentEvent.currency || DEFAULT_CURRENCY,
                paymentMethod,
                stripePaymentIntentId,
                stripeChargeId,
              ]
            );

            if (inserted.rowCount === 0) {
              await client.query(
                `UPDATE payments
                 SET appointment_id = $1,
                     patient_id = $2,
                     amount = $3,
                     currency = $4,
                     payment_method = $5,
                     stripe_charge_id = $7,
                     status = 'COMPLETED'
                 WHERE stripe_payment_intent_id = $6`,
                [
                  appointmentId,
                  patientId,
                  (supportedPaymentEvent.amount / 100).toFixed(2),
                  supportedPaymentEvent.currency || DEFAULT_CURRENCY,
                  paymentMethod,
                  stripePaymentIntentId,
                  stripeChargeId,
                ]
              );
            }
          }

          try {
            const appointmentServiceUrl = getServiceUrl('APPOINTMENT_SERVICE_URL', 'http://appointment-service:3004');
            const internalApiKey = process.env.INTERNAL_SERVICE_API_KEY;

            if (!internalApiKey) {
              throw new Error('INTERNAL_SERVICE_API_KEY is required for internal appointment updates');
            }

            await axios.patch(
              `${appointmentServiceUrl}/api/appointments/${encodeURIComponent(appointmentId)}/pay`,
              {},
              {
                headers: {
                  'x-internal-api-key': internalApiKey,
                },
                timeout: 5_000,
              }
            );
          } catch (error) {
            console.warn('[payment-service] Failed to update appointment status to PAID:', error);
          }

          await publishEvent('payment.confirmed', {
            appointmentId,
            patientId,
            amount: supportedPaymentEvent.amount / 100,
            currency: supportedPaymentEvent.currency,
            paymentIntentId: stripePaymentIntentId,
          });

          console.log(`[payment-service] Payment succeeded for appointment ${appointmentId}`);
        }

        if (event.type === 'payment_intent.payment_failed') {
          if (!supportedPaymentEvent) {
            throw new Error('Unexpected webhook payload for payment_intent.payment_failed');
          }

          await client.query(
            `UPDATE payments
             SET status = 'FAILED'
             WHERE stripe_payment_intent_id = $1`,
            [stripePaymentIntentId]
          );

          console.log(`[payment-service] Payment failed for intent ${stripePaymentIntentId}`);
        }

        await upsertWebhookEventStatus(client, event.id, event.type, stripePaymentIntentId, WEBHOOK_COMPLETED_STATUS);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Webhook processing failed';
        await upsertWebhookEventStatus(client, event.id, event.type, stripePaymentIntentId, WEBHOOK_FAILED_STATUS, message);
        throw error;
      } finally {
        await unlockAppointment(client, event.id);
      }
    });

    res.status(200).json({ received: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'PaymentIntent metadata is incomplete') {
      res.status(400).json({ error: error.message });
      return;
    }

    const stripeError = getStripeErrorResponse(error, 'Stripe webhook processing failed');
    if (stripeError) {
      console.warn('[payment-service] Stripe webhook error', {
        code: stripeError.code,
        status: stripeError.status,
        message: stripeError.message,
      });
      res.status(stripeError.status).json({
        error: stripeError.message,
        code: stripeError.code,
      });
      return;
    }

    console.error('[payment-service] handleWebhook failed', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

export const getPaymentByAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureDatabaseReady(res))) {
      return;
    }

    const { appointmentId } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await pool.query<PaymentRow>(
      `SELECT *
       FROM payments
       WHERE appointment_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [appointmentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Payment not found for this appointment' });
      return;
    }

    const payment = result.rows[0];

    if (user.role === 'patient' && payment.patient_id !== user.userId) {
      res.status(403).json({ error: 'Access denied: this payment does not belong to you' });
      return;
    }

    const formatted = formatPayment(payment);

    res.status(200).json({
      status: formatted.status,
      transactionId: formatted.transactionId,
      amount: formatted.amount,
      currency: formatted.currency,
      payment: formatted,
    });
  } catch (error) {
    console.error('[payment-service] getPaymentByAppointment failed', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

export const getAllPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureDatabaseReady(res))) {
      return;
    }

    const page = Number(req.query.page ?? '1');
    const limit = Number(req.query.limit ?? '20');

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      res.status(400).json({ error: 'Invalid pagination parameters' });
      return;
    }

    const offset = (page - 1) * limit;

    const [transactionsResult, countResult] = await Promise.all([
      pool.query<PaymentRow>(
        `SELECT *
         FROM payments
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM payments'),
    ]);

    const total = Number(countResult.rows[0]?.count || '0');

    res.status(200).json({
      transactions: transactionsResult.rows.map((payment) => formatPayment(payment)),
      total,
      page,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[payment-service] getAllPayments failed', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};