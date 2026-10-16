-- Migration: add_subscription_cancellation_request
-- Created at: 2026-10-15T12:00:00.000Z

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS cancellation_requested_at Nullable(DateTime);
