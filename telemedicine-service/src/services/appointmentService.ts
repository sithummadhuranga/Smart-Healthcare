import axios from 'axios';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface AppointmentRecord {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  consultationType?: 'ONLINE' | 'PHYSICAL';
  reason: string | null;
  status: AppointmentStatus;
  rejectionReason: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const getAppointmentServiceUrl = (): string =>
  process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3004';

function buildInternalHeaders(): Record<string, string> {
  const internalApiKey = process.env.INTERNAL_SERVICE_API_KEY;
  if (!internalApiKey) {
    throw new Error('INTERNAL_SERVICE_API_KEY is required for internal appointment updates');
  }

  return {
    'x-internal-api-key': internalApiKey,
  };
}

export async function getAppointmentById(
  appointmentId: string,
  authHeader: string
): Promise<AppointmentRecord> {
  const appointmentServiceUrl = getAppointmentServiceUrl();
  const response = await axios.get<AppointmentRecord>(
    `${appointmentServiceUrl}/api/appointments/${appointmentId}`,
    {
      headers: {
        Authorization: authHeader,
      },
      timeout: 10000,
    }
  );

  return response.data;
}

export async function markAppointmentInProgress(appointmentId: string): Promise<AppointmentRecord> {
  const appointmentServiceUrl = getAppointmentServiceUrl();
  const response = await axios.patch<AppointmentRecord>(
    `${appointmentServiceUrl}/api/appointments/${appointmentId}/start`,
    {},
    {
      headers: buildInternalHeaders(),
      timeout: 10000,
    }
  );

  return response.data;
}

export async function completeAppointmentAsDoctor(
  appointmentId: string,
  authHeader: string
): Promise<AppointmentRecord> {
  const appointmentServiceUrl = getAppointmentServiceUrl();
  const response = await axios.patch<AppointmentRecord>(
    `${appointmentServiceUrl}/api/appointments/${appointmentId}/complete`,
    {},
    {
      headers: {
        Authorization: authHeader,
      },
      timeout: 10000,
    }
  );

  return response.data;
}
