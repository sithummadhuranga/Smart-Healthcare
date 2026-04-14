import sgMail from '@sendgrid/mail';

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@healthcare.local';

function initializeSendGrid(): boolean {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return false;
  }

  sgMail.setApiKey(apiKey);
  return true;
}

const sendGridReady = initializeSendGrid();

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!sendGridReady) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  if (!to) {
    throw new Error('Email recipient is missing');
  }

  try {
    await sgMail.send({
      to,
      from: FROM_EMAIL,
      subject,
      html,
    });

    console.log(`[notification-service] Email sent to ${to}`);
  } catch (error) {
    console.error('[notification-service] Failed to send email', error);
    throw error;
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
