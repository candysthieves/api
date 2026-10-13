-- Migration: add_details_to_subscriptions_table
-- Created at: 2026-10-13T15:32:01.000Z

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS user_id String,
    ADD COLUMN IF NOT EXISTS last_payment_id UUID,
    ADD COLUMN IF NOT EXISTS expiration_date DateTime;
