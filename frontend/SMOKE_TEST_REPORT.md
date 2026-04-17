# Frontend API Coverage Report

This report compares the documented API contract against the frontend after the smoke-test implementation.

Status legend:
- `UI` means the runtime frontend calls the endpoint directly.
- `Smoke` means the endpoint is exercised by the frontend smoke suite.
- `N/A` means the endpoint is backend-only or not a frontend concern.
- `Gap` means the documented endpoint is not currently used by the runtime UI.

## Auth Service

| Method | Path | Coverage | Notes |
|---|---|---|---|
| POST | /api/auth/register | UI + Smoke | Used by registration page and smoke registration flow |
| POST | /api/auth/login | UI + Smoke | Used by login page and session bootstrap |
| POST | /api/auth/refresh | UI + Smoke | Used by Axios interceptor refresh flow |
| POST | /api/auth/logout | UI + Smoke | Used by navbar sign-out |
| GET | /api/auth/me | UI + Smoke | Used after login to resolve the canonical role |

## Patient Service

| Method | Path | Coverage | Notes |
|---|---|---|---|
| GET | /api/patients/profile | UI + Smoke | Patient profile page |
| PUT | /api/patients/profile | UI + Smoke | Profile update is limited to documented fields in the UI |
| POST | /api/patients/reports | UI + Smoke | Runtime UI uses report upload; backend currently also requires undocumented `reportType` |
| GET | /api/patients/reports | UI + Smoke | Medical reports page |
| GET | /api/patients/prescriptions | UI + Smoke | Patient prescriptions page |
| GET | /api/patients/history | Smoke | Not surfaced in a dedicated runtime page, but covered by smoke tests |
| GET | /api/patients/:id | Smoke | Admin detail lookup is smoke-covered; runtime admin page remains list-focused |
| GET | /api/patients | UI + Smoke | Admin patient listing page |

## Doctor Service

| Method | Path | Coverage | Notes |
|---|---|---|---|
| GET | /api/doctors | UI + Smoke | Browse doctors page |
| GET | /api/doctors/:id | Smoke | Smoke-covered public detail endpoint |
| GET | /api/doctors/profile | UI + Smoke | Doctor profile page |
| PUT | /api/doctors/profile | UI + Smoke | Doctor profile and consultation fee updates |
| GET | /api/doctors/schedule | UI + Smoke | Doctor schedule page |
| POST | /api/doctors/schedule | UI + Smoke | Doctor schedule page |
| DELETE | /api/doctors/schedule/:slotId | UI + Smoke | Doctor schedule page |
| POST | /api/doctors/prescriptions | UI + Smoke | Doctor prescription page |
| GET | /api/doctors/prescriptions | Smoke | Runtime UI does not have a dedicated listing page |
| GET | /api/doctors/patients/:patientId/reports | Smoke | Covered as part of the doctor report access flow |
| PATCH | /api/doctors/:id/verify | UI + Smoke | Admin doctor verification page |
| GET | /api/doctors/pending | UI + Smoke | Admin doctor verification page |

## Appointment Service

| Method | Path | Coverage | Notes |
|---|---|---|---|
| GET | /api/appointments | UI + Smoke | Patient and doctor appointment pages |
| POST | /api/appointments | UI + Smoke | Doctor booking flow |
| GET | /api/appointments/:id | Smoke | Covered after booking |
| PATCH | /api/appointments/:id/cancel | UI + Smoke | Patient appointments page |
| PATCH | /api/appointments/:id/accept | UI + Smoke | Doctor appointments page |
| PATCH | /api/appointments/:id/reject | UI + Smoke | Doctor appointments page |
| PATCH | /api/appointments/:id/complete | Gap | Runtime UI completes through telemedicine end; smoke suite validates completion through telemedicine flow |
| GET | /api/appointments/admin/all | UI + Smoke | Admin appointments page |
| PATCH | /api/appointments/:id/pay | N/A | Internal service endpoint |
| PATCH | /api/appointments/:id/start | N/A | Internal service endpoint |

## Telemedicine Service

| Method | Path | Coverage | Notes |
|---|---|---|---|
| POST | /api/telemedicine/token | UI + Smoke | Patient and doctor video pages |
| POST | /api/telemedicine/start | UI + Smoke | Doctor video page; full start/end smoke requires a paid fixture appointment because appointment-service only allows `PAID -> IN_PROGRESS` |
| POST | /api/telemedicine/end | UI + Smoke | Doctor video page; full start/end smoke requires a paid fixture appointment |
| GET | /api/telemedicine/:appointmentId | Smoke | Covered by the smoke suite |

## Payment Service

| Method | Path | Coverage | Notes |
|---|---|---|---|
| POST | /api/payments/intent | UI + Smoke | Patient payment page |
| POST | /api/payments/webhook | N/A | Stripe-only backend endpoint |
| GET | /api/payments/:appointmentId | UI + Smoke | Patient payment status lookup |
| GET | /api/payments/admin/all | Smoke | Covered by admin smoke checks |

## Notification Service

| Method | Path | Coverage | Notes |
|---|---|---|---|
| GET | /api/notifications/health | UI + Smoke | Admin dashboard system-health card |

## AI Service

| Method | Path | Coverage | Notes |
|---|---|---|---|
| POST | /api/ai/check | UI + Smoke | Patient AI symptom checker page |
| GET | /api/ai/health | UI | Admin dashboard system-health card |
| GET | /docs | N/A | Direct FastAPI docs, not a frontend integration path |

## Known Contract Drift

| Area | Issue | Frontend Handling |
|---|---|---|
| Patient report upload | The attached docs omit `reportType`, but the current backend requires it | The runtime UI and smoke tests send `reportType` so uploads still work |
| Payment intent | The docs list only `clientSecret`, while the backend currently returns additional Stripe metadata | The payment page now depends only on `clientSecret` and treats the extra fields as optional |
| Patient history | The docs describe appointment-style history records, while the backend currently returns patient plus grouped report history | Smoke tests verify reachability, not the exact report-history schema |
| Telemedicine start | The telemedicine service delegates to appointment-service, which only permits `PAID -> IN_PROGRESS` | The smoke suite validates token generation on a confirmed appointment and supports full start/end when `SMOKE_PAID_APPOINTMENT_ID` is supplied |
| AI symptom check | Live AI availability depends on external Gemini quota | The smoke suite fails loudly with the backend error payload when quota or provider availability is exhausted |
