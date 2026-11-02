-- Business test tariff: $1 (100 USD cents), five minutes = 5 / 1440 days.
-- Keep an already-created test tariff and make retries safe.
INSERT INTO tariffs (id, name, duration_days, price, subscription_type_id)
SELECT toUInt32(max(id) + 1), 'Test - 5 minutes', 5.0 / 1440, 100, 2
FROM tariffs
HAVING countIf(name = 'Test - 5 minutes') = 0;
