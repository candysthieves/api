-- Persist YooKassa renewal state and durable email work.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_method_id Nullable(String),
  ADD COLUMN IF NOT EXISTS next_charge_date Nullable(DateTime),
  ADD COLUMN IF NOT EXISTS retry_count UInt8 DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_renewal_attempt_key Nullable(String);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS user_id Nullable(String),
  ADD COLUMN IF NOT EXISTS provider_payment_id Nullable(String),
  ADD COLUMN IF NOT EXISTS amount_minor_units Nullable(String),
  ADD COLUMN IF NOT EXISTS currency Nullable(String);

CREATE TABLE IF NOT EXISTS subscription_notifications
(
  id UUID,
  user_id String,
  kind Enum8('RENEWAL_RETRY_SCHEDULED' = 1, 'SUBSCRIPTION_ENDED_AFTER_RETRY' = 2),
  created_at DateTime DEFAULT now(),
  delivered_at Nullable(DateTime) DEFAULT NULL
)
ENGINE = ReplacingMergeTree()
ORDER BY id;
