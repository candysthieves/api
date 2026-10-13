-- Migration: add_updated_at_and_deleted_at_to_tariffs
-- Created at: 2026-10-13T11:33:45.513Z

ALTER TABLE tariffs
    ADD COLUMN IF NOT EXISTS updated_at Nullable(DateTime) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS deleted_at Nullable(DateTime) DEFAULT NULL;

