-- Migration: add_subscription_types_table
-- Created at: 2026-10-13T09:00:00.000Z

CREATE TABLE IF NOT EXISTS subscription_types
(
    id UInt8,
    name_payment_status Enum8('Personal' = 1, 'Business' = 2),
    created_at DateTime DEFAULT now(),
    updated_at DateTime DEFAULT now(),
    deleted_at Nullable(DateTime) DEFAULT NULL
)
ENGINE = MergeTree()
ORDER BY id;

INSERT INTO subscription_types (id, name_payment_status)
VALUES (1, 'Personal'), (2, 'Business');
