-- Stop payments while applying this migration. Keep the backup until verified.
-- Historical UUID v5 calculation is used ONLY to recover cleaned legacy rows.
-- Pending payloads keep their original wire eventId for downstream deduplication.
-- Deploy the new code only after this migration succeeds. Do not run old code
-- against the migrated table. The *_20261118 tables are retained for rollback.
CREATE TABLE IF NOT EXISTS payment_outbox_pair_20261118
(
    event_id UUID,
    consumer Enum8('MAIN' = 1, 'NOTIFICATIONS' = 2),
    status Enum8('UNPROCESSED' = 1, 'PROCESSING' = 2, 'OK' = 3, 'ERROR' = 4),
    data Nullable(String),
    attempts Nullable(UInt8),
    created_at Nullable(Int64),
    processing_started_at Nullable(Int64),
    next_attempt_at Nullable(Int64),
    completed_at Nullable(Int64),
    last_error Nullable(String)
)
ENGINE = MergeTree()
ORDER BY (event_id, consumer);

CREATE TABLE IF NOT EXISTS payment_outbox_legacy_ids_20261118
ENGINE = MergeTree ORDER BY legacy_id AS
WITH SHA1(concat(unhex('9e7e582d7e314c4eae0fc951230c7d41'), toString(id), ':notification')) AS digest
SELECT DISTINCT id AS payment_id,
    toUUID(UUIDNumToString(toFixedString(concat(
        substring(digest, 1, 6),
        char(bitOr(bitAnd(reinterpretAsUInt8(substring(digest, 7, 1)), 15), 80)),
        substring(digest, 8, 1),
        char(bitOr(bitAnd(reinterpretAsUInt8(substring(digest, 9, 1)), 63), 128)),
        substring(digest, 10, 7)
    ), 16))) AS legacy_id
FROM payments;

-- Refuse to lose deduplication history if a cleaned legacy payment was deleted.
SELECT throwIf(count() > 0, 'Cannot recover legacy notification IDs: restore missing payment records before migration')
FROM payment_outbox
WHERE data IS NULL AND substring(toString(event_id), 15, 1) = '5'
  AND event_id NOT IN (SELECT legacy_id FROM payment_outbox_legacy_ids_20261118)
  AND event_id NOT IN (SELECT id FROM payments);

INSERT INTO payment_outbox_pair_20261118
SELECT
    if(recipient = 'NOTIFICATIONS',
        coalesce(toUUIDOrNull(JSONExtractString(ifNull(o.data, ''), 'data', 'paymentId')), m.payment_id),
        o.event_id) AS canonical_id,
    if(JSONExtractString(ifNull(o.data, ''), 'consumer') = 'NOTIFICATIONS'
        OR m.payment_id IS NOT NULL, 'NOTIFICATIONS', 'MAIN') AS recipient,
    o.status, o.data, o.attempts, o.created_at, o.processing_started_at,
    o.next_attempt_at, o.completed_at, o.last_error
FROM payment_outbox AS o
LEFT JOIN payment_outbox_legacy_ids_20261118 AS m ON o.event_id = m.legacy_id
WHERE (canonical_id, recipient) NOT IN
    (SELECT event_id, toString(consumer) FROM payment_outbox_pair_20261118)
SETTINGS join_use_nulls = 1;

SELECT throwIf(
    (SELECT count() FROM payment_outbox_pair_20261118) != (SELECT count() FROM payment_outbox),
    'Outbox row count mismatch: inspect staging table before switching'
);

RENAME TABLE payment_outbox TO payment_outbox_uuid_backup_20261118,
    payment_outbox_pair_20261118 TO payment_outbox;
