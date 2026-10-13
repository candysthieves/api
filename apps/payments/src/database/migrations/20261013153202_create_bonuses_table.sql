-- Migration: create_bonuses_table
-- Created at: 2026-10-13T15:32:02.000Z

CREATE TABLE IF NOT EXISTS bonuses
(
    user_id String,
    bonus_hours UInt32 DEFAULT 0
)
ENGINE = MergeTree()
ORDER BY (user_id);
