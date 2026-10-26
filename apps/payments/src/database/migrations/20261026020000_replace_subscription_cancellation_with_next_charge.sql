ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS next_charge_date Nullable(DateTime);

-- Preserve existing cancellations and the renewal date previously exposed by the API.
ALTER TABLE subscriptions UPDATE
    next_charge_date = if(cancellation_requested_at IS NOT NULL, NULL, coalesce(next_charge_date, expiration_date))
WHERE 1
SETTINGS mutations_sync = 1;

ALTER TABLE subscriptions DROP COLUMN cancellation_requested_at;
