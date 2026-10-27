-- Five minutes is 5 / 1440 days (approximately 0.003472222222222222).
-- Existing whole-day durations are preserved.
ALTER TABLE tariffs MODIFY COLUMN duration_days Float64;
