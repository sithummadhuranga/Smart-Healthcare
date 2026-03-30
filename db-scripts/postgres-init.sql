-- ============================================================
-- postgres-init.sql
-- Runs automatically when the postgres container first starts.
-- Creates appointmentdb + paymentdb with full schemas.
-- Member 1 — Infrastructure Lead
-- ============================================================

-- appointmentdb already created via POSTGRES_DB env var.
-- We only need to create paymentdb here.
CREATE DATABASE paymentdb;

-- Grant privileges on the new database
GRANT ALL PRIVILEGES ON DATABASE paymentdb TO postgres;

-- ============================================================
-- appointmentdb schema
-- ============================================================
\c appointmentdb;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS appointments (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id       VARCHAR     NOT NULL,
    doctor_id        VARCHAR     NOT NULL,
    slot_id          VARCHAR     NOT NULL,
    reason           TEXT,
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    scheduled_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_patient   ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_app_doctor    ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_app_status    ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_app_slot      ON appointments (doctor_id, slot_id);

-- Trigger: keep updated_at current on every update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON appointments;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- paymentdb schema
-- ============================================================
\c paymentdb;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS payments (
    id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id            UUID          NOT NULL,
    patient_id                VARCHAR       NOT NULL,
    amount                    NUMERIC(10,2) NOT NULL,
    currency                  VARCHAR(3)    NOT NULL DEFAULT 'USD',
    stripe_payment_intent_id  VARCHAR,
    stripe_charge_id          VARCHAR,
    status                    VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pay_appointment ON payments (appointment_id);
CREATE INDEX IF NOT EXISTS idx_pay_patient     ON payments (patient_id);
CREATE INDEX IF NOT EXISTS idx_pay_status      ON payments (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_stripe_intent ON payments (stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;
