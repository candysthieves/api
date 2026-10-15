-- Migration: add_subscription_type_to_tariffs
-- Existing tariffs are Business plans.

ALTER TABLE tariffs
    ADD COLUMN IF NOT EXISTS subscription_type_id UInt8 DEFAULT 2;
