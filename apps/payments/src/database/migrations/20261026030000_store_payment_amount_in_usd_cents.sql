-- Existing payments must be empty or have amounts normalized to USD cents before applying.
ALTER TABLE payments
    DROP COLUMN IF EXISTS currency,
    DROP COLUMN IF EXISTS amount_minor_units;
