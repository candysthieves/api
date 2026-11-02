-- Do not silently reinterpret payments with a removed status.
SELECT throwIf(count() > 0, 'Payments contain statuses that require explicit migration')
FROM payments
WHERE toString(status) NOT IN ('pending', 'succeeded', 'failed', 'canceled');

ALTER TABLE payments
    MODIFY COLUMN status Enum8('pending' = 1, 'succeeded' = 2, 'failed' = 3, 'canceled' = 5) DEFAULT 'pending';
