-- Migration: add_tariff_id_to_subscriptions_table
-- Created at: 2026-10-14T14:43:00.000Z

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS tariff_id UUID;
