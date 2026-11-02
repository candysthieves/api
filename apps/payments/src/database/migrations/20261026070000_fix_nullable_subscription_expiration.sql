-- Earlier installations already recorded the renewals migration while this
-- column was still non-nullable. A separate migration is required for them.
ALTER TABLE subscriptions
    MODIFY COLUMN expiration_date Nullable(DateTime);

-- NULL inserted into the old DateTime column became the zero timestamp.
-- Restore only fresh unpaid subscriptions that were failed by that timestamp.
-- Real payment failures and subscriptions older than 15 minutes stay Failed.
ALTER TABLE subscriptions UPDATE
    expiration_date = NULL,
    status = if(
        status = 'Failed'
        AND created_at >= now() - INTERVAL 15 MINUTE
        AND (
            last_payment_id IS NULL
            OR last_payment_id IN (SELECT id FROM payments WHERE status = 'pending')
        ),
        'Processing',
        status
    )
WHERE expiration_date = toDateTime(0) AND status IN ('Processing', 'Failed')
SETTINGS mutations_sync = 1;
