-- Migration: rename_price_to_price_in_minor_units_in_tariffs
-- Created at: 2026-10-13T16:14:09.189Z

ALTER TABLE tariffs RENAME COLUMN IF EXISTS price TO price_in_minor_units;
