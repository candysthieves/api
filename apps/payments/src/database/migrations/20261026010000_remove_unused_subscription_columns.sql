ALTER TABLE subscriptions
    DROP COLUMN IF EXISTS payment_method_id,
    DROP COLUMN IF EXISTS retry_count,
    DROP COLUMN IF EXISTS last_renewal_attempt_key;
