ALTER TABLE payments RENAME COLUMN IF EXISTS user_external_payment_id TO external_payment_id;
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS user_id String DEFAULT '',
    ADD COLUMN IF NOT EXISTS amount UInt64 DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency String DEFAULT '',
    ADD COLUMN IF NOT EXISTS payment_method_id Nullable(String) DEFAULT NULL,
    MODIFY COLUMN status Enum8('pending' = 1, 'succeeded' = 2, 'failed' = 3, 'refunded' = 4, 'canceled' = 5) DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS payment_inbox
(
    event_id UUID,
    status Enum8('UNPROCESSED' = 1, 'PROCESSING' = 2, 'OK' = 3, 'ERROR' = 4) DEFAULT 'UNPROCESSED',
    data Nullable(String),
    attempts Nullable(UInt8) DEFAULT 0,
    created_at Nullable(Int64),
    processing_started_at Nullable(Int64),
    next_attempt_at Nullable(Int64),
    completed_at Nullable(Int64),
    last_error Nullable(String)
)
ENGINE = MergeTree()
ORDER BY event_id;

CREATE TABLE IF NOT EXISTS payment_outbox AS payment_inbox;
