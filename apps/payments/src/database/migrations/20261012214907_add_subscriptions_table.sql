-- Migration: add_subscriptions_table
-- Created at: 2026-10-12T18:49:07.565Z

CREATE TABLE IF NOT EXISTS subscriptions
(
    id UUID DEFAULT generateUUIDv4(),
    created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (created_at, id);


