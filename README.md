# AI-Enabled Smart Healthcare Platform

**SE3020 — Distributed Systems | Group Assignment**
**SLIIT | Year 3 Semester 2 | 2025/2026**

---

## Overview

A production-grade, cloud-native healthcare telemedicine platform built using a microservices architecture. Patients can browse verified doctors, book appointments, attend real-time video consultations, make payments, upload medical reports, and use an AI-powered symptom checker. Doctors manage their schedules, accept appointments, and issue digital prescriptions. Admins verify doctor registrations and oversee platform activity.

## Technology Stack

| Layer | Technology |
|---|---|
| Backend Services (8) | Node.js 20 LTS + Express.js 4.x + TypeScript |
| AI Service | Python 3.11 + FastAPI + Google Gemini API |
| Frontend | React 18 + Vite 5 + TypeScript + React Router v6 + Axios |
| Databases | MongoDB 7 (Patient, Doctor, Auth) + PostgreSQL 15 (Appointment, Payment) |
| Message Queue | RabbitMQ 3 with Management Plugin |
| API Gateway | Node.js + Express + http-proxy-middleware + Nginx |
| Auth | JWT (access + refresh tokens) + bcrypt (12 rounds) |
| Containerisation | Docker + Docker Compose |
| Orchestration | Kubernetes (Minikube — local) |
| Video | Agora RTC SDK |
| Payments | Stripe Sandbox |
| SMS | Twilio |
| Email | SendGrid |
| File Storage | Cloudinary |

## Services

| Service | Port | Owner |
|---|---|---|
| API Gateway | 3000 | Member 1 |
| Auth Service | 3001 | Member 1 |
| Patient Service | 3002 | Member 1 |
| Doctor Service | 3003 | Member 2 |
| Appointment Service | 3004 | Member 2 |
| Telemedicine Service | 3005 | Member 3 |
| Payment Service | 3006 | Member 3 |
| Notification Service | 3007 | Member 3 |
| AI Symptom Checker | 8000 | Member 4 |
| React Frontend (Vite build via Nginx) | 80 | Member 4 |

## Quick Start (Docker Compose)

```bash
git clone https://github.com/[YOUR-REPO-URL].git
cd GroupID-DS-Assignment
cp .env.example .env        # fill in all blank values
docker-compose up --build
```

Access the app at **http://localhost**  
See [readme.txt](readme.txt) for the full deployment guide including Kubernetes/Minikube instructions.

## Repository Structure

```
GroupID-DS-Assignment/
├── api-gateway/              # Member 1 — JWT validation, routing, rate limiting
├── auth-service/             # Member 1 — Register, login, JWT issuance
├── patient-service/          # Member 1 — Patient profile, reports, prescriptions
├── doctor-service/           # Member 2 — Doctor profile, schedule, prescriptions
├── appointment-service/      # Member 2 — Booking, state machine, RabbitMQ events
├── telemedicine-service/     # Member 3 — Agora token generation, session control
├── payment-service/          # Member 3 — Stripe payment intent + webhook
├── notification-service/     # Member 3 — RabbitMQ consumer, Twilio SMS, SendGrid email
├── ai-symptom-service/       # Member 4 — Python FastAPI + Google Gemini AI
├── frontend/                 # Member 4 — Vite + TypeScript React client
├── k8s/                      # Member 1 — All Kubernetes manifests
├── db-scripts/               # DB init scripts (MongoDB indexes + PostgreSQL schema)
├── docker-compose.yml        # Member 1 — Full stack local orchestration
├── .env.example              # Environment variable template (commit this, never .env)
├── api-contracts.md          # Agreed API contracts — source of truth for all members
├── readme.txt                # Full deployment guide (submitted deliverable)
├── members.txt               # Team member details
└── submission.txt            # GitHub URL + YouTube demo URL
```

## Git Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Protected — production-ready only. PRs required. |
| `dev` | Integration branch — merge feature branches here first. |
| `feature/auth-service` | Member 1 |
| `feature/patient-service` | Member 1 |
| `infra/kubernetes` | Member 1 |
| `feature/doctor-service` | Member 2 |
| `feature/appointment-service` | Member 2 |
| `feature/telemedicine-service` | Member 3 |
| `feature/payment-service` | Member 3 |
| `feature/notification-service` | Member 3 |
| `feature/ai-symptom-service` | Member 4 |
| `feature/frontend` | Member 4 |

## API Contracts

All endpoint definitions are in [api-contracts.md](api-contracts.md). This is the agreed source of truth. No endpoint, method, or response shape changes without team agreement.

## Environment Variables

Copy `.env.example` to `.env` and fill in all values. The example file contains comments explaining where to get each API key. Never commit `.env` — it is in `.gitignore`.

## Team

| Role | Member |
|---|---|
| Infrastructure Lead + Auth + Patient Service | Member 1 |
| Doctor Service + Appointment Service | Member 2 |
| Telemedicine + Payment + Notification | Member 3 |
| Frontend + AI Symptom Checker | Member 4 |
