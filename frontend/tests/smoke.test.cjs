const axios = require('axios');
const {
  ApiSession,
  DEFAULT_BASE_URL,
  DEFAULT_CREDENTIALS,
  createFutureSlot,
  expect2xx,
  tinyPngBuffer,
  uniqueEmail,
} = require('./helpers/smokeClient.cjs');

jest.setTimeout(180000);

const rawClient = axios.create({
  baseURL: DEFAULT_BASE_URL,
  validateStatus: () => true,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

const admin = new ApiSession({ label: 'admin', ...DEFAULT_CREDENTIALS.admin });
const patient = new ApiSession({ label: 'patient', ...DEFAULT_CREDENTIALS.patient });
const doctor = new ApiSession({ label: 'doctor', ...DEFAULT_CREDENTIALS.doctor });
const hasPaidTelemedicineFixture = Boolean(process.env.SMOKE_PAID_APPOINTMENT_ID);

let adminMe;
let patientMe;
let doctorMe;
let doctorProfile;
let adminPatientRecord;
let reportTitle;
const slotIds = {};
const appointmentIds = {};

function expectErrorStatus(response, status) {
  expect(response.status).toBe(status);
  expect(response.data).toHaveProperty('error');
}

async function createDoctorSlot(label) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const seed = Date.now() + attempt * 97 + label.length * 31;
    const slot = createFutureSlot(
      2 + (seed % 10),
      8 + ((seed + attempt) % 9),
      ((seed + attempt) % 2) * 30
    );

    const response = await doctor.post('/api/doctors/schedule', slot);
    if (response.status >= 200 && response.status < 300) {
      return response.data.slotId || response.data.slot?.slotId;
    }

    if (response.status !== 409) {
      throw new Error(`Failed to create ${label} slot: ${response.status} ${JSON.stringify(response.data)}`);
    }
  }

  throw new Error(`Failed to create a unique ${label} slot after repeated conflicts`);
}

async function settleQuickly(promise, timeoutMs = 1500) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}

async function loginSeededSessions() {
  expect2xx(await admin.login());
  expect2xx(await patient.login());
  expect2xx(await doctor.login());

  adminMe = expect2xx(await admin.get('/api/auth/me')).data;
  patientMe = expect2xx(await patient.get('/api/auth/me')).data;
  doctorMe = expect2xx(await doctor.get('/api/auth/me')).data;
  const doctorProfileResponse = expect2xx(await doctor.get('/api/doctors/profile')).data;
  doctorProfile = doctorProfileResponse.doctor || doctorProfileResponse;
}

beforeAll(async () => {
  await loginSeededSessions();
});

afterAll(async () => {
  await Promise.allSettled([
    settleQuickly(admin.logout()),
    settleQuickly(patient.logout()),
    settleQuickly(doctor.logout()),
  ]);
}, 5000);

test('auth flow covers register, login, me, refresh, and logout', async () => {
  const email = uniqueEmail('smoke.patient');
  const password = 'Smoke@12345';
  const tempUser = new ApiSession({ email, password, label: 'temp-patient' });

  const registerResponse = await rawClient.post('/api/auth/register', {
    name: 'Smoke Patient',
    email,
    password,
    role: 'patient',
  });

  expect2xx(registerResponse);
  expect(registerResponse.data).toHaveProperty('userId');

  expect2xx(await tempUser.login());

  const meResponse = await tempUser.get('/api/auth/me');
  expect2xx(meResponse);
  expect(meResponse.data.role).toBe('patient');

  const refreshResponse = await tempUser.refresh();
  expect2xx(refreshResponse);
  expect(typeof refreshResponse.data.accessToken).toBe('string');

  const logoutResponse = await tempUser.logout();
  expect2xx(logoutResponse);
});

test('gateway auth guards enforce 401 and 403 correctly', async () => {
  expectErrorStatus(await rawClient.get('/api/patients/profile'), 401);
  expectErrorStatus(await patient.post('/api/doctors/schedule', createFutureSlot(4, 15, 0)), 403);
  expectErrorStatus(await patient.get('/api/appointments/admin/all'), 403);
});

test('patient endpoints cover profile, history, reports, and prescriptions', async () => {
  const profileResponse = await patient.get('/api/patients/profile');
  expect2xx(profileResponse);
  expect(profileResponse.data).toHaveProperty('patient');

  const updateResponse = await patient.put('/api/patients/profile', {
    name: 'Smoke Patient Profile',
    phone: '+94 771234567',
    dateOfBirth: '1998-05-10',
    address: 'Colombo, Sri Lanka',
  });
  expect2xx(updateResponse);

  const historyResponse = await patient.get('/api/patients/history');
  expect2xx(historyResponse);

  reportTitle = `Smoke Report ${Date.now()}`;
  const uploadResponse = await patient.postMultipart(
    '/api/patients/reports',
    {
      title: reportTitle,
      description: 'Smoke-test upload',
      reportType: 'lab',
    },
    {
      fieldName: 'file',
      buffer: tinyPngBuffer(),
      filename: 'smoke-report.png',
      contentType: 'image/png',
    }
  );
  expect2xx(uploadResponse);

  const reportsResponse = await patient.get('/api/patients/reports');
  expect2xx(reportsResponse);
  const reports = Array.isArray(reportsResponse.data) ? reportsResponse.data : reportsResponse.data.reports;
  expect(Array.isArray(reports)).toBe(true);
  expect(reports.some((report) => report.title === reportTitle)).toBe(true);

  const prescriptionsResponse = await patient.get('/api/patients/prescriptions');
  expect2xx(prescriptionsResponse);
});

test('doctor endpoints cover public discovery, profile, schedule create/delete, and report access', async () => {
  const listResponse = await rawClient.get('/api/doctors');
  expect2xx(listResponse);
  expect(Array.isArray(listResponse.data)).toBe(true);

  const detailResponse = await rawClient.get(`/api/doctors/${doctorProfile._id}`);
  expect2xx(detailResponse);
  expect(detailResponse.data).toHaveProperty('name');

  const scheduleResponse = await doctor.get('/api/doctors/schedule');
  expect2xx(scheduleResponse);

  const plannedSlotLabels = ['deletable', 'payment', 'telemedicine', 'cancel', 'reject'];

  for (const label of plannedSlotLabels) {
    slotIds[label] = await createDoctorSlot(label);
  }

  const deleteResponse = await doctor.delete(`/api/doctors/schedule/${slotIds.deletable}`);
  expect2xx(deleteResponse);

  const doctorReportAccess = await doctor.get(`/api/doctors/patients/${patientMe.userId}/reports`);
  expect2xx(doctorReportAccess);
  expect(Array.isArray(doctorReportAccess.data)).toBe(true);
  expect(doctorReportAccess.data.some((report) => report.title === reportTitle)).toBe(true);
});

test('appointment endpoints cover booking, lookup, accept, cancel, and reject flows', async () => {
  const patientAppointmentsResponse = await patient.get('/api/appointments');
  expect2xx(patientAppointmentsResponse);

  const bookingMatrix = [
    ['payment', slotIds.payment],
    ['telemedicine', slotIds.telemedicine],
    ['cancel', slotIds.cancel],
    ['reject', slotIds.reject],
  ];

  for (const [label, slotId] of bookingMatrix) {
    const response = await patient.post('/api/appointments', {
      doctorId: doctorProfile._id,
      slotId,
      reason: `Smoke ${label} appointment`,
    });
    expect2xx(response);
    appointmentIds[label] = response.data.id;
  }

  expect2xx(await patient.get(`/api/appointments/${appointmentIds.payment}`));
  expect2xx(await doctor.patch(`/api/appointments/${appointmentIds.payment}/accept`));
  expect2xx(await doctor.patch(`/api/appointments/${appointmentIds.telemedicine}/accept`));
  expect2xx(await patient.patch(`/api/appointments/${appointmentIds.cancel}/cancel`));
  expect2xx(await doctor.patch(`/api/appointments/${appointmentIds.reject}/reject`, { reason: 'Smoke rejection' }));

  const doctorAppointmentsResponse = await doctor.get('/api/appointments');
  expect2xx(doctorAppointmentsResponse);
  const doctorAppointments = Array.isArray(doctorAppointmentsResponse.data) ? doctorAppointmentsResponse.data : doctorAppointmentsResponse.data.appointments;
  expect(doctorAppointments.some((appointment) => appointment.id === appointmentIds.payment)).toBe(true);
});

test('payment endpoints cover intent creation, payment lookup, and admin listing', async () => {
  const intentResponse = await patient.post('/api/payments/intent', {
    appointmentId: appointmentIds.payment,
  });
  expect2xx(intentResponse);
  expect(typeof intentResponse.data.clientSecret).toBe('string');

  const paymentLookupResponse = await patient.get(`/api/payments/${appointmentIds.payment}`);
  expect2xx(paymentLookupResponse);
  expect(paymentLookupResponse.data).toHaveProperty('status');

  const adminPaymentsResponse = await admin.get('/api/payments/admin/all', {
    params: { page: 1, limit: 10 },
  });
  expect2xx(adminPaymentsResponse);
  expect(adminPaymentsResponse.data).toHaveProperty('transactions');
});

test('telemedicine endpoints cover token generation, start, session info, and end', async () => {
  const patientTokenResponse = await patient.post('/api/telemedicine/token', {
    appointmentId: appointmentIds.telemedicine,
  });
  expect2xx(patientTokenResponse);
  expect(patientTokenResponse.data).toHaveProperty('token');

  if (!hasPaidTelemedicineFixture) {
    const startBlockedResponse = await doctor.post('/api/telemedicine/start', {
      appointmentId: appointmentIds.telemedicine,
    });
    expect(startBlockedResponse.status).toBe(400);
    expect(startBlockedResponse.data).toHaveProperty('error');

    const infoResponse = await doctor.get(`/api/telemedicine/${appointmentIds.telemedicine}`);
    expect2xx(infoResponse);
    expect(infoResponse.data.status).toBe('CONFIRMED');
    return;
  }

  const paidAppointmentId = process.env.SMOKE_PAID_APPOINTMENT_ID;
  const startResponse = await doctor.post('/api/telemedicine/start', {
    appointmentId: paidAppointmentId,
  });
  expect2xx(startResponse);

  const infoResponse = await doctor.get(`/api/telemedicine/${paidAppointmentId}`);
  expect2xx(infoResponse);
  expect(infoResponse.data).toHaveProperty('status');

  const endResponse = await doctor.post('/api/telemedicine/end', {
    appointmentId: paidAppointmentId,
  });
  expect2xx(endResponse);
});

test('doctor prescription flow is visible to both doctor and patient', async () => {
  const createPrescriptionResponse = await doctor.post('/api/doctors/prescriptions', {
    patientId: patientMe.userId,
    appointmentId: appointmentIds.telemedicine,
    medications: [
      {
        name: 'Paracetamol',
        dosage: '500mg',
        frequency: 'Twice daily',
      },
    ],
    notes: 'Smoke prescription note',
  });
  expect2xx(createPrescriptionResponse);

  const doctorPrescriptionsResponse = await doctor.get('/api/doctors/prescriptions');
  expect2xx(doctorPrescriptionsResponse);

  const patientPrescriptionsResponse = await patient.get('/api/patients/prescriptions');
  expect2xx(patientPrescriptionsResponse);
});

test('admin endpoints cover patient list/detail, doctor verification, appointments, and notifications health', async () => {
  const patientsResponse = await admin.get('/api/patients', {
    params: { page: 1, limit: 20 },
  });
  expect2xx(patientsResponse);

  const patients = Array.isArray(patientsResponse.data.patients) ? patientsResponse.data.patients : [];
  adminPatientRecord = patients.find((record) => record.userId === patientMe.userId) || patients[0];
  expect(adminPatientRecord).toBeTruthy();

  const patientDetailResponse = await admin.get(`/api/patients/${adminPatientRecord._id}`);
  expect2xx(patientDetailResponse);

  const pendingDoctorsResponse = await admin.get('/api/doctors/pending');
  expect2xx(pendingDoctorsResponse);
  expect(Array.isArray(pendingDoctorsResponse.data)).toBe(true);

  const verifyResponse = await admin.patch(`/api/doctors/${doctorProfile._id}/verify`, {
    verified: true,
    reason: 'Smoke verification check',
  });
  expect2xx(verifyResponse);

  const adminAppointmentsResponse = await admin.get('/api/appointments/admin/all', {
    params: { page: 1, limit: 20 },
  });
  expect2xx(adminAppointmentsResponse);
  expect(adminAppointmentsResponse.data).toHaveProperty('appointments');

  const notificationsHealthResponse = await admin.get('/api/notifications/health');
  expect2xx(notificationsHealthResponse);
  expect(notificationsHealthResponse.data).toHaveProperty('status');
});

test('ai symptom endpoint works for patient role with documented response fields', async () => {
  const response = await patient.post('/api/ai/check', {
    symptoms: ['headache', 'fever'],
  });
  if (response.status >= 500) {
    throw new Error(`AI symptom check failed with ${response.status}: ${JSON.stringify(response.data)}`);
  }
  expect2xx(response);
  expect(response.data).toHaveProperty('specialty');
  expect(response.data).toHaveProperty('note');
  expect(response.data).toHaveProperty('disclaimer');
});
