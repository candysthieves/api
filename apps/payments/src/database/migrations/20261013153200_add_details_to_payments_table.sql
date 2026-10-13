-- Migration: add_details_to_payments_table
-- Created at: 2026-10-13T15:32:00.000Z

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS user_external_payment_id String,
    ADD COLUMN IF NOT EXISTS tariff_id UUID,
    ADD COLUMN IF NOT EXISTS status Enum8('pending' = 1, 'succeeded' = 2, 'failed' = 3, 'refunded' = 4) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS payment_date Nullable(DateTime) DEFAULT NULL;
