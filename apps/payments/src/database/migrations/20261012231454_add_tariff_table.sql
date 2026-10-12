-- Migration: add_tariff_table
-- Created at: 2026-10-12T20:14:54.327Z

CREATE TABLE IF NOT EXISTS tariffs
(
    id UUID DEFAULT generateUUIDv4(),
    name String,
    duration_days UInt32,
    price Decimal(10, 2),
    created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (created_at, id);

