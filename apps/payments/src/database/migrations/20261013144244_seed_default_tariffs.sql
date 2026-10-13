-- Migration: seed_default_tariffs
-- Created at: 2026-10-13T11:42:44.967Z

INSERT INTO tariffs (id, name, duration_days, price) VALUES
    (generateUUIDv4(), 'Daily', 1, '100'),
    (generateUUIDv4(), 'Weekly', 7, '630'),
    (generateUUIDv4(), 'Monthly', 30, '2500'),
    (generateUUIDv4(), 'Quarterly', 90, '6300');

