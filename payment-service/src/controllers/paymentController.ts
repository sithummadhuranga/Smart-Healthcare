// FILE: src/controllers/paymentController.ts
import axios, { AxiosError } from 'axios';
import { Response } from 'express';
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
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_CONSULTATION_FEE = 25.0;
const DEFAULT_CURRENCY = 'usd';

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
  status: row.status,
  stripePaymentIntentId: row.stripe_payment_intent_id,
  stripeChargeId: row.stripe_charge_id,
  createdAt: row.created_at,
});

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

    const existingPaymentResult = await pool.query<PaymentRow>(
      `SELECT *
       FROM payments
       WHERE appointment_id = $1 AND status = 'PENDING'
       ORDER BY created_at DESC
       LIMIT 1`,
      [appointmentId]
    );

    const stripe = getStripeClient();

    if (existingPaymentResult.rows.length > 0) {
      const existingPayment = existingPaymentResult.rows[0];

      if (existingPayment.stripe_payment_intent_id) {
        const existingIntent = await stripe.paymentIntents.retrieve(existingPayment.stripe_payment_intent_id);

        res.status(201).json({
          clientSecret: existingIntent.client_secret,
          paymentIntentId: existingIntent.id,
          amount: existingIntent.amount,
          currency: existingIntent.currency,
        });
        return;
      }

      const consultationFee = await fetchConsultationFee(appointmentDoctorId);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(consultationFee * 100),
        currency: DEFAULT_CURRENCY,
        metadata: {
          appointmentId,
          patientId: user.userId,
        },
      });

      await pool.query(
        `UPDATE payments
         SET amount = $1,
             currency = $2,
             stripe_payment_intent_id = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [consultationFee.toFixed(2), DEFAULT_CURRENCY, paymentIntent.id, existingPayment.id]
      );

      res.status(201).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      });
      return;
    }

    const consultationFee = await fetchConsultationFee(appointmentDoctorId);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(consultationFee * 100),
      currency: DEFAULT_CURRENCY,
      metadata: {
        appointmentId,
        patientId: user.userId,
      },
    });

    const createdPayment = await createPaymentRecord(appointmentId, user.userId, consultationFee, paymentIntent.id);

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      paymentId: createdPayment.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'APPOINTMENT_SERVICE_UNAVAILABLE') {
      res.status(503).json({ error: 'Appointment service is unavailable' });
      return;
    }

    const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
    if (typeof status === 'number') {
      const message = error instanceof Error ? error.message : 'Request failed';
      res.status(status).json({ error: message });
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

    let event: Stripe.Event;

    if (webhookSecret) {
      if (typeof sig !== 'string') {
        res.status(400).json({ error: 'Missing Stripe signature header' });
        return;
      }

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid Stripe webhook signature';
        res.status(400).json({ error: message });
        return;
      }
    } else {
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');

      try {
        event = JSON.parse(rawBody) as Stripe.Event;
      } catch {
        res.status(400).json({ error: 'Invalid webhook payload' });
        return;
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const appointmentId = paymentIntent.metadata?.appointmentId;
      const patientId = paymentIntent.metadata?.patientId;
      const stripeChargeId = typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge
          ? String(paymentIntent.latest_charge)
          : null;

      if (!appointmentId || !patientId) {
        res.status(400).json({ error: 'PaymentIntent metadata is incomplete' });
        return;
      }

      const updateResult = await pool.query<PaymentRow>(
        `UPDATE payments
         SET status = 'SUCCEEDED',
             stripe_charge_id = $1,
             updated_at = NOW()
         WHERE stripe_payment_intent_id = $2
         RETURNING *`,
        [stripeChargeId, paymentIntent.id]
      );

      if (updateResult.rowCount === 0) {
        await pool.query(
          `INSERT INTO payments (
            appointment_id,
            patient_id,
            amount,
            currency,
            stripe_payment_intent_id,
            stripe_charge_id,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'SUCCEEDED')
          ON CONFLICT (stripe_payment_intent_id) DO UPDATE
          SET status = 'SUCCEEDED',
              stripe_charge_id = EXCLUDED.stripe_charge_id,
              updated_at = NOW()`,
          [
            appointmentId,
            patientId,
            (paymentIntent.amount / 100).toFixed(2),
            paymentIntent.currency || DEFAULT_CURRENCY,
            paymentIntent.id,
            stripeChargeId,
          ]
        );
      }

      try {
        const appointmentServiceUrl = getServiceUrl('APPOINTMENT_SERVICE_URL', 'http://appointment-service:3004');

        await axios.patch(
          `${appointmentServiceUrl}/api/appointments/${encodeURIComponent(appointmentId)}/pay`,
          {},
          {
            headers: {
              'x-service-secret': 'internal',
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
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        paymentIntentId: paymentIntent.id,
      });

      console.log(`[payment-service] Payment succeeded for appointment ${appointmentId}`);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await pool.query(
        `UPDATE payments
         SET status = 'FAILED',
             updated_at = NOW()
         WHERE stripe_payment_intent_id = $1`,
        [paymentIntent.id]
      );

      console.log(`[payment-service] Payment failed for intent ${paymentIntent.id}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
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

    res.status(200).json(formatPayment(payment));
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