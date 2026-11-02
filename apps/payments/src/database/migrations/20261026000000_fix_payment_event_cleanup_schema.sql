-- Stop payments before applying: these columns are copied before being replaced.
-- DateTime64(3) and Int64 both store signed 64-bit milliseconds. Reinterpretation
-- preserves all milliseconds (a regular DateTime64 -> Int64 cast loses precision).
-- Temporary columns are materialized before removing their DEFAULT dependencies.
-- Reapplying this migration to the current Int64 schema preserves the values.

SELECT throwIf(count() != 4, 'Unsupported payment event timestamp schema')
FROM system.columns
WHERE database = currentDatabase() AND table = 'payment_inbox'
  AND name IN ('created_at', 'processing_started_at', 'next_attempt_at', 'completed_at')
  AND type IN ('DateTime64(3)', 'Nullable(DateTime64(3))', 'Int64', 'Nullable(Int64)');

ALTER TABLE payment_inbox
    MODIFY COLUMN data Nullable(String),
    MODIFY COLUMN attempts Nullable(UInt8) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at_migration_ms Nullable(Int64)
        DEFAULT if(isNull(created_at), NULL, reinterpretAsInt64(assumeNotNull(created_at))),
    ADD COLUMN IF NOT EXISTS processing_started_at_migration_ms Nullable(Int64)
        DEFAULT if(isNull(processing_started_at), NULL, reinterpretAsInt64(assumeNotNull(processing_started_at))),
    ADD COLUMN IF NOT EXISTS next_attempt_at_migration_ms Nullable(Int64)
        DEFAULT if(isNull(next_attempt_at), NULL, reinterpretAsInt64(assumeNotNull(next_attempt_at))),
    ADD COLUMN IF NOT EXISTS completed_at_migration_ms Nullable(Int64)
        DEFAULT if(isNull(completed_at), NULL, reinterpretAsInt64(assumeNotNull(completed_at)));

ALTER TABLE payment_inbox
    MODIFY COLUMN created_at_migration_ms DEFAULT
        if(isNull(created_at), NULL, reinterpretAsInt64(assumeNotNull(created_at))),
    MODIFY COLUMN processing_started_at_migration_ms DEFAULT
        if(isNull(processing_started_at), NULL, reinterpretAsInt64(assumeNotNull(processing_started_at))),
    MODIFY COLUMN next_attempt_at_migration_ms DEFAULT
        if(isNull(next_attempt_at), NULL, reinterpretAsInt64(assumeNotNull(next_attempt_at))),
    MODIFY COLUMN completed_at_migration_ms DEFAULT
        if(isNull(completed_at), NULL, reinterpretAsInt64(assumeNotNull(completed_at)));

ALTER TABLE payment_inbox
    MATERIALIZE COLUMN created_at_migration_ms,
    MATERIALIZE COLUMN processing_started_at_migration_ms,
    MATERIALIZE COLUMN next_attempt_at_migration_ms,
    MATERIALIZE COLUMN completed_at_migration_ms
SETTINGS mutations_sync = 1;

ALTER TABLE payment_inbox
    MODIFY COLUMN created_at_migration_ms REMOVE DEFAULT,
    MODIFY COLUMN processing_started_at_migration_ms REMOVE DEFAULT,
    MODIFY COLUMN next_attempt_at_migration_ms REMOVE DEFAULT,
    MODIFY COLUMN completed_at_migration_ms REMOVE DEFAULT;

ALTER TABLE payment_inbox
    DROP COLUMN created_at,
    RENAME COLUMN created_at_migration_ms TO created_at,
    DROP COLUMN processing_started_at,
    RENAME COLUMN processing_started_at_migration_ms TO processing_started_at,
    DROP COLUMN next_attempt_at,
    RENAME COLUMN next_attempt_at_migration_ms TO next_attempt_at,
    DROP COLUMN completed_at,
    RENAME COLUMN completed_at_migration_ms TO completed_at;

SELECT throwIf(count() != 4, 'Unsupported payment event timestamp schema')
FROM system.columns
WHERE database = currentDatabase() AND table = 'payment_outbox'
  AND name IN ('created_at', 'processing_started_at', 'next_attempt_at', 'completed_at')
  AND type IN ('DateTime64(3)', 'Nullable(DateTime64(3))', 'Int64', 'Nullable(Int64)');

ALTER TABLE payment_outbox
    MODIFY COLUMN data Nullable(String),
    MODIFY COLUMN attempts Nullable(UInt8) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at_migration_ms Nullable(Int64)
        DEFAULT if(isNull(created_at), NULL, reinterpretAsInt64(assumeNotNull(created_at))),
    ADD COLUMN IF NOT EXISTS processing_started_at_migration_ms Nullable(Int64)
        DEFAULT if(isNull(processing_started_at), NULL, reinterpretAsInt64(assumeNotNull(processing_started_at))),
    ADD COLUMN IF NOT EXISTS next_attempt_at_migration_ms Nullable(Int64)
        DEFAULT if(isNull(next_attempt_at), NULL, reinterpretAsInt64(assumeNotNull(next_attempt_at))),
    ADD COLUMN IF NOT EXISTS completed_at_migration_ms Nullable(Int64)
        DEFAULT if(isNull(completed_at), NULL, reinterpretAsInt64(assumeNotNull(completed_at)));

ALTER TABLE payment_outbox
    MODIFY COLUMN created_at_migration_ms DEFAULT
        if(isNull(created_at), NULL, reinterpretAsInt64(assumeNotNull(created_at))),
    MODIFY COLUMN processing_started_at_migration_ms DEFAULT
        if(isNull(processing_started_at), NULL, reinterpretAsInt64(assumeNotNull(processing_started_at))),
    MODIFY COLUMN next_attempt_at_migration_ms DEFAULT
        if(isNull(next_attempt_at), NULL, reinterpretAsInt64(assumeNotNull(next_attempt_at))),
    MODIFY COLUMN completed_at_migration_ms DEFAULT
        if(isNull(completed_at), NULL, reinterpretAsInt64(assumeNotNull(completed_at)));

ALTER TABLE payment_outbox
    MATERIALIZE COLUMN created_at_migration_ms,
    MATERIALIZE COLUMN processing_started_at_migration_ms,
    MATERIALIZE COLUMN next_attempt_at_migration_ms,
    MATERIALIZE COLUMN completed_at_migration_ms
SETTINGS mutations_sync = 1;

ALTER TABLE payment_outbox
    MODIFY COLUMN created_at_migration_ms REMOVE DEFAULT,
    MODIFY COLUMN processing_started_at_migration_ms REMOVE DEFAULT,
    MODIFY COLUMN next_attempt_at_migration_ms REMOVE DEFAULT,
    MODIFY COLUMN completed_at_migration_ms REMOVE DEFAULT;

ALTER TABLE payment_outbox
    DROP COLUMN created_at,
    RENAME COLUMN created_at_migration_ms TO created_at,
    DROP COLUMN processing_started_at,
    RENAME COLUMN processing_started_at_migration_ms TO processing_started_at,
    DROP COLUMN next_attempt_at,
    RENAME COLUMN next_attempt_at_migration_ms TO next_attempt_at,
    DROP COLUMN completed_at,
    RENAME COLUMN completed_at_migration_ms TO completed_at;
