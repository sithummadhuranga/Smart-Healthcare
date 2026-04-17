# API Contracts — SE3020 Smart Healthcare Platform

> **This is the single source of truth for all API endpoints.**
> All team members code strictly to this contract.
> No endpoint path, HTTP method, request body field, or response shape changes
> without agreement from all 4 members and an update to this file.

---

## Service Port Reference

| Service | Port |
|---|---|
| API Gateway | 3000 |
| Auth Service | 3001 |
| Patient Service | 3002 |
| Doctor Service | 3003 |
| Appointment Service | 3004 |
| Telemedicine Service | 3005 |
| Payment Service | 3006 |
| Notification Service | 3007 |
| AI Symptom Checker | 8000 |

---

## Auth Header Convention

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

Error response shape (all services):
```json
{ "error": "descriptive error message" }
```

HTTP status codes:
| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad request — missing or invalid fields |
| 401 | No token or invalid/expired token |
| 403 | Valid token but wrong role |
| 404 | Resource not found |
| 409 | Conflict — e.g. slot already booked, email already registered |
| 500 | Internal server error |

---

## 4.1 Auth Service — Port 3001

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | None | `{ name, email, password, role }` | `{ userId, message }` |
| `POST` | `/api/auth/login` | None | `{ email, password }` | `{ accessToken }` + sets `refreshToken` httpOnly cookie |
| `POST` | `/api/auth/refresh` | refreshToken cookie | — | `{ accessToken }` |
| `POST` | `/api/auth/logout` | Bearer token | — | `{ message }` + clears cookie |
| `GET` | `/api/auth/me` | Bearer token | — | `{ userId, role, email, name }` |
| `GET` | `/health` | None | — | `{ status: "ok", service: "auth-service" }` |

**Notes:**
- `role` must be one of: `"patient"` `"doctor"` (admin is seeded directly)
- Access token expires in **15 minutes**
- Refresh token expires in **7 days** (stored in httpOnly cookie named `refreshToken`)
- Passwords hashed with bcrypt, **12 salt rounds**
- Passwords **never** returned in any response

**JWT payload:**
```json
{ "userId": "uuid", "role": "patient|doctor|admin", "email": "...", "name": "...", "iat": 0, "exp": 0 }
```

---

## 4.2 Patient Service — Port 3002

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/patients/profile` | patient | — | Patient profile object |
| `PUT` | `/api/patients/profile` | patient | `{ name, phone, dateOfBirth, address }` | Updated profile object |
| `POST` | `/api/patients/reports` | patient | Multipart: `file` + `{ title, description }` | `{ reportId, cloudinaryUrl, uploadedAt }` |
| `GET` | `/api/patients/reports` | patient | — | `[{ reportId, cloudinaryUrl, title, description, uploadedAt }]` |
| `GET` | `/api/patients/prescriptions` | patient | — | `[{ prescriptionId, doctorId, medications, notes, issuedAt }]` |
| `GET` | `/api/patients/history` | patient | — | `[{ appointmentId, doctorId, status, scheduledAt, completedAt }]` |
| `GET` | `/api/patients/:id` | admin | — | Full patient profile (any patient) |
| `GET` | `/api/patients` | admin | Query: `?page=&limit=` | `{ patients: [], total, page, limit }` |
| `GET` | `/health` | None | — | `{ status: "ok", service: "patient-service" }` |

**File upload constraints:**
- Accepted types: PDF, JPG, PNG only
- Max size: 10 MB per file
- Storage: Cloudinary (URL saved in MongoDB)

**MongoDB Schema — Patient:**
```
{
  _id: ObjectId,
  userId: String,       // from JWT (Auth Service userId)
  name: String,
  email: String,
  phone: String,
  dateOfBirth: Date,
  address: String,
  medicalReports: [{
    reportId: String,
    cloudinaryUrl: String,
    title: String,
    description: String,
    uploadedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 4.3 Doctor Service — Port 3003

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/doctors` | **Public** | Query: `?specialty=` | `[{ _id, name, specialty, bio, consultationFee, isVerified, availableSlots }]` — `isVerified: true` only |
| `GET` | `/api/doctors/pending` | admin | — | `[{ _id, name, email, specialty, qualifications, isVerified }]` |
| `GET` | `/api/doctors/profile` | doctor | — | Own full doctor profile |
| `GET` | `/api/doctors/schedule` | doctor | — | `[{ slotId, date, startTime, endTime, isBooked }]` |
| `GET` | `/api/doctors/prescriptions` | doctor | — | `[{ _id, patientId, appointmentId, medications, notes, issuedAt }]` |
| `GET` | `/api/doctors/:id` | **Public** | — | Single doctor public profile (no sensitive fields) |
| `GET` | `/api/doctors/patients/:patientId/reports` | doctor | — | Patient's uploaded medical reports array |
| `PUT` | `/api/doctors/profile` | doctor | `{ specialty, bio, phone, consultationFee, qualifications }` | Updated doctor profile |
| `POST` | `/api/doctors/schedule` | doctor | `{ date, startTime, endTime }` | `{ slotId, date, startTime, endTime, isBooked: false }` |
| `POST` | `/api/doctors/prescriptions` | doctor | `{ patientId, appointmentId, medications: [{ name, dosage, frequency }], notes }` | Created prescription object |
| `DELETE` | `/api/doctors/schedule/:slotId` | doctor | — | `{ message: "Slot removed" }` — only if `isBooked: false` |
| `PATCH` | `/api/doctors/:id/verify` | admin | `{ verified: true/false, reason }` | Updated doctor |
| `GET` | `/health` | None | — | `{ status: "ok", service: "doctor-service" }` |

**MongoDB Schema — Doctor:**
```
{
  _id: ObjectId,
  userId: String,
  name: String,
  email: String,
  specialty: String,
  bio: String,
  qualifications: [String],
  consultationFee: Number,
  isVerified: Boolean,       // false until admin approves
  availableSlots: [{
    slotId: String,          // uuid generated on creation
    date: Date,
    startTime: String,       // e.g. "09:00"
    endTime: String,         // e.g. "09:30"
    isBooked: Boolean
  }],
  createdAt: Date
}
```

**MongoDB Schema — Prescription:**
```
{
  _id: ObjectId,
  doctorId: String,
  patientId: String,
  appointmentId: String,
  medications: [{ name: String, dosage: String, frequency: String }],
  notes: String,
  issuedAt: Date
}
```

---

## 4.4 Appointment Service — Port 3004

**Status State Machine:**
```
PENDING → CONFIRMED → PAID → IN_PROGRESS → COMPLETED
    ↓           ↓
REJECTED    CANCELLED
```

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/appointments` | patient or doctor | Query: `?status=` | Own appointments array |
| `GET` | `/api/appointments/admin/all` | admin | Query: `?page=&status=` | `{ appointments: [], total, page }` |
| `GET` | `/api/appointments/:id` | patient or doctor | — | Appointment detail object |
| `POST` | `/api/appointments` | patient | `{ doctorId, slotId, reason }` | Created appointment (`status: "PENDING"`) |
| `PATCH` | `/api/appointments/:id/cancel` | patient | — | Updated appointment (`status: "CANCELLED"`) |
| `PATCH` | `/api/appointments/:id/accept` | doctor | — | Updated appointment (`status: "CONFIRMED"`) |
| `PATCH` | `/api/appointments/:id/reject` | doctor | `{ reason }` | Updated appointment (`status: "REJECTED"`) |
| `PATCH` | `/api/appointments/:id/complete` | doctor | — | Updated appointment (`status: "COMPLETED"`) |
| `GET` | `/health` | None | — | `{ status: "ok", service: "appointment-service" }` |

**Internal endpoints (called by other services, not exposed via API Gateway):**
| Method | Path | Auth | Description |
|---|---|---|---|
| `PATCH` | `/api/appointments/:id/pay` | internal service | Payment Service calls this to set status to `PAID` |
| `PATCH` | `/api/appointments/:id/start` | internal service | Telemedicine Service calls this to set status to `IN_PROGRESS` |

**State transition rules:**
- `cancel` — only if current status is `PENDING` or `CONFIRMED`. Patient only.
- `accept` — only if current status is `PENDING`. Doctor only (must own the appointment).
- `reject` — only if current status is `PENDING`. Doctor only.
- `complete` — only if current status is `IN_PROGRESS`. Doctor only.

**RabbitMQ events published** (queue: `notifications`):

| Event | Published when |
|---|---|
| `appointment.booked` | POST /api/appointments — new booking created |
| `appointment.confirmed` | PATCH /:id/accept — doctor accepts |
| `appointment.cancelled` | PATCH /:id/cancel — patient cancels |
| `consultation.completed` | PATCH /:id/complete — doctor ends session |
| `prescription.issued` | Doctor Service calls internal endpoint after issuing prescription |

**PostgreSQL Schema — appointments table:**
```sql
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      VARCHAR NOT NULL,
  doctor_id       VARCHAR NOT NULL,
  slot_id         VARCHAR NOT NULL,
  reason          TEXT,
  status          VARCHAR(20) DEFAULT 'PENDING',
  rejection_reason TEXT,
  scheduled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4.5 Telemedicine Service — Port 3005

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| `POST` | `/api/telemedicine/token` | patient or doctor | `{ appointmentId }` | `{ token, channelName, uid, appId }` |
| `POST` | `/api/telemedicine/start` | doctor | `{ appointmentId }` | `{ sessionId, startedAt }` |
| `POST` | `/api/telemedicine/end` | doctor | `{ appointmentId }` | `{ endedAt, duration }` |
| `GET` | `/api/telemedicine/:appointmentId` | patient or doctor | — | `{ channelName, status, duration }` |
| `GET` | `/health` | None | — | `{ status: "ok", service: "telemedicine-service" }` |

**Notes:**
- `token` endpoint verifies the requesting user is actually the patient or doctor on this appointment (calls Appointment Service internally).
- Agora token expires in 3600 seconds.
- `channelName` = `appointmentId` (UUID string).
- `start` sets appointment status to `IN_PROGRESS` via Appointment Service.
- `end` sets appointment status to `COMPLETED` and publishes `consultation.completed` to RabbitMQ.

---

## 4.6 Payment Service — Port 3006

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| `POST` | `/api/payments/intent` | patient | `{ appointmentId }` | `{ clientSecret }` |
| `POST` | `/api/payments/webhook` | None (Stripe-Signature header) | Raw body | `{ received: true }` |
| `GET` | `/api/payments/:appointmentId` | patient or admin | — | `{ status, transactionId, amount, currency }` |
| `GET` | `/api/payments/admin/all` | admin | Query: `?page=` | `{ transactions: [], total }` |
| `GET` | `/health` | None | — | `{ status: "ok", service: "payment-service" }` |

**Critical implementation note for webhook:**
- The `/api/payments/webhook` route **must** use `express.raw({ type: 'application/json' })` middleware.
- This route must be registered **before** `express.json()` is applied globally.
- Stripe signature verified via `stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET)`.

**On `payment_intent.succeeded`:**
1. Update payment record to `COMPLETED` in PostgreSQL.
2. Call Appointment Service `PATCH /api/appointments/:id/pay` to set status to `PAID`.
3. Publish `payment.confirmed` event to RabbitMQ.

**PostgreSQL Schema — payments table:**
```sql
CREATE TABLE payments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id            UUID NOT NULL,
  patient_id                VARCHAR NOT NULL,
  amount                    NUMERIC(10,2) NOT NULL,
  currency                  VARCHAR(3) DEFAULT 'USD',
  stripe_payment_intent_id  VARCHAR,
  stripe_charge_id          VARCHAR,
  status                    VARCHAR(20) DEFAULT 'PENDING',
  created_at                TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4.7 Notification Service — Port 3007

This service is a **RabbitMQ consumer only**. It has no public REST API except the health endpoint.

**Health endpoint:**
| Method | Path | Auth | Response |
|---|---|---|---|
| `GET` | `/health` | None | `{ status: "ok", service: "notification-service", consumer: "active" }` |

**RabbitMQ events consumed** (queue: `notifications`, durable: true):

| Event | SMS (Twilio) | Email (SendGrid) |
|---|---|---|
| `appointment.booked` | Patient: "Appointment with Dr. X pending confirmation" | Patient: booking details. Doctor: new request notification. |
| `appointment.confirmed` | Patient: "Appointment confirmed. Please complete payment." | Patient: confirmation + payment link. |
| `appointment.cancelled` | Patient + Doctor: "Appointment cancelled." | Patient + Doctor: cancellation notice. |
| `payment.confirmed` | Patient: "Payment received. Consultation scheduled." | Patient: full consultation details. |
| `consultation.completed` | — | Patient: "Session complete. View your prescription." |
| `prescription.issued` | — | Patient: "New prescription available. Login to view." |

**Consumer setup:**
- Connect with retry logic (5 retries, 5s delay between attempts).
- `channel.prefetch(1)` — process one message at a time.
- `ack` only after SMS and email both sent successfully.
- `nack` without requeue on invalid message format.

---

## 4.8 AI Symptom Checker — Port 8000 (Python FastAPI)

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| `POST` | `/api/ai/check` | patient (validated by Gateway) | `{ symptoms: ["headache", "fever"] }` | `{ specialty, note, disclaimer }` |
| `GET` | `/api/ai/health` | None | — | `{ status: "ok" }` |
| `GET` | `/docs` | None | — | FastAPI auto-generated OpenAPI UI |

**Gemini prompt structure:**

System instruction:
```
You are a medical triage assistant. You must respond ONLY with valid JSON, no explanation, no markdown, no extra text.
```

User message:
```
Patient reports these symptoms: {comma-separated list}.
Based on these symptoms, respond with exactly this JSON structure:
{"specialty":"<the most relevant medical specialty>","note":"<2 sentences of preliminary observation, do not diagnose>","disclaimer":"<a safety disclaimer advising the patient to consult a qualified doctor>"}
```

**Model:** `gemini-1.5-flash` (free tier, 1M tokens/month)

---

## API Gateway — Routing and Access Rules

| Path Prefix | Upstream Service | Public Access | Role Restriction |
|---|---|---|---|
| `/api/auth/*` | auth-service:3001 | Yes (login/register) | — |
| `/api/patients/*` | patient-service:3002 | No | `patient` or `admin` |
| `/api/doctors` (GET) | doctor-service:3003 | Yes | — |
| `/api/doctors/:id` (GET) | doctor-service:3003 | Yes | — |
| `/api/doctors/*` (other) | doctor-service:3003 | No | `doctor` or `admin` |
| `/api/appointments/*` | appointment-service:3004 | No | `patient`, `doctor`, or `admin` |
| `/api/telemedicine/*` | telemedicine-service:3005 | No | `patient` or `doctor` |
| `/api/payments/*` | payment-service:3006 | No (`/webhook` excluded) | `patient` or `admin` |
| `/api/ai/*` | ai-symptom-service:8000 | No | `patient` only |

**Rate limiting:** 100 requests per 15 minutes per IP (applied at Gateway level)
