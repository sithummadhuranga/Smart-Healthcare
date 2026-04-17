import sgMail from '@sendgrid/mail';

const DEFAULT_FROM_EMAIL = 'noreply@healthcare.local';
const DEFAULT_FROM_NAME = 'Smart Healthcare';
const FROM_EMAIL = process.env.FROM_EMAIL?.trim() || '';
const FROM_NAME = process.env.FROM_NAME?.trim() || DEFAULT_FROM_NAME;
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL?.trim() || FROM_EMAIL;
const REPLY_TO_NAME = process.env.REPLY_TO_NAME?.trim() || FROM_NAME;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY?.trim();

type SendGridErrorItem = {
  message?: string;
  field?: string;
  help?: string;
};

type SendGridErrorLike = {
  response?: {
    body?: {
      errors?: SendGridErrorItem[];
    };
  };
};

function hasValidSenderEmail(email: string): boolean {
  if (!email || email === DEFAULT_FROM_EMAIL) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.toLowerCase().endsWith('.local');
}

function getEmailConfigurationIssue(): string | null {
  if (!SENDGRID_API_KEY) {
    return 'missing SENDGRID_API_KEY';
  }

  if (!hasValidSenderEmail(FROM_EMAIL)) {
    return 'missing verified FROM_EMAIL';
  }

  return null;
}

function initializeSendGrid(): boolean {
  if (getEmailConfigurationIssue()) {
    return false;
  }

  sgMail.setApiKey(SENDGRID_API_KEY!);
  return true;
}

const sendGridReady = initializeSendGrid();

export function isEmailConfigured(): boolean {
  return sendGridReady;
}

export function getEmailProviderStatus(): 'active' | 'degraded' {
  return sendGridReady ? 'active' : 'degraded';
}

export function getEmailProviderIssue(): string | null {
  return getEmailConfigurationIssue();
}

function getSendGridErrorMessage(error: unknown): string {
  const fallbackMessage = error instanceof Error ? error.message : 'Failed to send email';
  const sendGridErrors = (error as SendGridErrorLike)?.response?.body?.errors;

  if (!Array.isArray(sendGridErrors) || sendGridErrors.length === 0) {
    return fallbackMessage;
  }

  return sendGridErrors
    .map((item) => {
      const details = [item.message, item.field ? `field=${item.field}` : undefined, item.help]
        .filter((value): value is string => Boolean(value));

      return details.join(' | ');
    })
    .filter((value) => value.length > 0)
    .join('; ') || fallbackMessage;
}

function buildEmailIdentity(email: string, name: string): { email: string; name?: string } {
  return name ? { email, name } : { email };
}

function getReplyToIdentity(): { email: string; name?: string } {
  const replyToEmail = hasValidSenderEmail(REPLY_TO_EMAIL) ? REPLY_TO_EMAIL : FROM_EMAIL;
  const replyToName = REPLY_TO_NAME || FROM_NAME;

  return buildEmailIdentity(replyToEmail, replyToName);
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!sendGridReady) {
    throw new Error(getEmailConfigurationIssue() || 'Email provider is not configured');
  }

  if (!to) {
    throw new Error('Email recipient is missing');
  }

  try {
    await sgMail.send({
      to,
      from: buildEmailIdentity(FROM_EMAIL, FROM_NAME),
      replyTo: getReplyToIdentity(),
      subject,
      html,
    });

    console.log(`[notification-service] Email sent to ${to}`);
  } catch (error) {
    const providerMessage = getSendGridErrorMessage(error);
    console.error(`[notification-service] Failed to send email: ${providerMessage}`);
    throw new Error(providerMessage);
  }
}

export async function sendAppointmentBookedEmail(
  patientEmail: string,
  patientName: string,
  doctorName: string,
  scheduledDate: string,
  scheduledTime: string
): Promise<void> {
  const subject = `Appointment Request Received - Dr. ${doctorName}`;
  const html = `
    <h2>Appointment Request Received</h2>
    <p>Hi ${patientName},</p>
    <p>Your appointment request is pending doctor confirmation.</p>
    <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
    <p><strong>Date:</strong> ${scheduledDate}</p>
    <p><strong>Time:</strong> ${scheduledTime}</p>
  `;

  await sendEmail(patientEmail, subject, html);
}

export async function sendPatientWelcomeEmail(
  patientEmail: string,
  patientName: string
): Promise<void> {
  const subject = 'Welcome to Smart Healthcare';
  const html = `
    <h2>Welcome to Smart Healthcare</h2>
    <p>Hi ${patientName},</p>
    <p>Your patient account was created successfully.</p>
    <p>You can now sign in to manage appointments, reports, and prescriptions.</p>
  `;

  await sendEmail(patientEmail, subject, html);
}

export async function sendDoctorRegistrationReceivedEmail(
  doctorEmail: string,
  doctorName: string
): Promise<void> {
  const subject = 'Doctor Registration Received';
  const html = `
    <h2>Registration Received</h2>
    <p>Hi ${doctorName},</p>
    <p>Your doctor account has been created successfully.</p>
    <p>An administrator will review your account before you can sign in.</p>
  `;

  await sendEmail(doctorEmail, subject, html);
}

export async function sendDoctorNewAppointmentEmail(
  doctorEmail: string,
  patientName: string
): Promise<void> {
  const subject = `New Appointment Request from ${patientName}`;
  const html = `
    <h2>New Appointment Request</h2>
    <p>You received a new appointment request from ${patientName}.</p>
  `;

  await sendEmail(doctorEmail, subject, html);
}

export async function sendAppointmentConfirmedEmail(
  patientEmail: string,
  patientName: string,
  doctorName: string,
  paymentLink: string
): Promise<void> {
  const subject = 'Appointment Confirmed - Payment Required';
  const html = `
    <h2>Your Appointment is Confirmed</h2>
    <p>Hi ${patientName},</p>
    <p>Dr. ${doctorName} confirmed your appointment.</p>
    <p>Please complete payment: <a href="${paymentLink}">${paymentLink}</a></p>
  `;

  await sendEmail(patientEmail, subject, html);
}

export async function sendAppointmentCancelledEmail(
  email: string,
  personName: string,
  scheduledDate: string
): Promise<void> {
  const subject = 'Appointment Cancelled';
  const html = `
    <h2>Appointment Cancelled</h2>
    <p>Hi ${personName},</p>
    <p>Your appointment scheduled on ${scheduledDate} has been cancelled.</p>
  `;

  await sendEmail(email, subject, html);
}

export async function sendPaymentConfirmedEmail(
  patientEmail: string,
  patientName: string,
  doctorName: string,
  amount: number,
  scheduledDate: string
): Promise<void> {
  const subject = 'Payment Confirmed';
  const html = `
    <h2>Payment Successful</h2>
    <p>Hi ${patientName},</p>
    <p>Your payment of $${amount.toFixed(2)} for consultation with Dr. ${doctorName} was successful.</p>
    <p>Scheduled date: ${scheduledDate}</p>
  `;

  await sendEmail(patientEmail, subject, html);
}

export async function sendConsultationCompletedEmail(
  patientEmail: string,
  patientName: string,
  doctorName: string
): Promise<void> {
  const subject = 'Consultation Completed';
  const html = `
    <h2>Consultation Completed</h2>
    <p>Hi ${patientName},</p>
    <p>Your consultation with Dr. ${doctorName} is complete.</p>
    <p>Login to view your prescription.</p>
  `;

  await sendEmail(patientEmail, subject, html);
}

export async function sendPrescriptionIssuedEmail(
  patientEmail: string,
  patientName: string,
  doctorName: string
): Promise<void> {
  const subject = 'New Prescription Available';
  const html = `
    <h2>Prescription Issued</h2>
    <p>Hi ${patientName},</p>
    <p>Dr. ${doctorName} issued a new prescription for you.</p>
    <p>Login to your dashboard to view it.</p>
  `;

  await sendEmail(patientEmail, subject, html);
}
