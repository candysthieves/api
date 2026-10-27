ALTER TABLE subscriptions
    MODIFY COLUMN last_payment_id Nullable(UUID),
    MODIFY COLUMN expiration_date Nullable(DateTime),
    ADD COLUMN IF NOT EXISTS provider Nullable(String),
    ADD COLUMN IF NOT EXISTS status Enum8('Processing' = 1, 'Done' = 2, 'Failed' = 3) DEFAULT 'Done';

ALTER TABLE payments
    MODIFY COLUMN external_payment_id Nullable(String);

-- Existing subscriptions were created only after a successful payment.
-- Recover their provider from the referenced payment, leaving unknown values NULL.
ALTER TABLE subscriptions UPDATE provider = 'YOOKASSA'
WHERE provider IS NULL AND last_payment_id IN (
    SELECT id FROM payments WHERE provider = 'YOOKASSA'
)
SETTINGS mutations_sync = 1;

ALTER TABLE subscriptions UPDATE provider = 'STRIPE'
WHERE provider IS NULL AND last_payment_id IN (
    SELECT id FROM payments WHERE provider = 'STRIPE'
)
SETTINGS mutations_sync = 1;
