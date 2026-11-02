-- Run with payments writes stopped. Keep originals as backups after the switch.
CREATE TABLE tariff_id_mapping_20261026
ENGINE = MergeTree ORDER BY old_id AS
SELECT id AS old_id,
       toUInt32(row_number() OVER (ORDER BY duration_days, name, id)) AS new_id
FROM tariffs;

-- Refuse to lose records whose tariff is missing.
SELECT throwIf(count() > 0, 'Payments reference missing tariffs')
FROM payments WHERE tariff_id NOT IN (SELECT old_id FROM tariff_id_mapping_20261026);
SELECT throwIf(count() > 0, 'Subscriptions reference missing tariffs')
FROM subscriptions WHERE tariff_id NOT IN (SELECT old_id FROM tariff_id_mapping_20261026);

CREATE TABLE tariffs_integer_ids
(
    id UInt32,
    name String,
    duration_days UInt32,
    price Decimal(10, 2),
    created_at DateTime DEFAULT now(),
    updated_at Nullable(DateTime) DEFAULT NULL,
    deleted_at Nullable(DateTime) DEFAULT NULL,
    subscription_type_id UInt8 DEFAULT 2
)
ENGINE = MergeTree ORDER BY (created_at, id);

INSERT INTO tariffs_integer_ids
SELECT m.new_id, t.name, t.duration_days, t.price_in_minor_units,
       t.created_at, t.updated_at, t.deleted_at, t.subscription_type_id
FROM tariffs AS t INNER JOIN tariff_id_mapping_20261026 AS m ON t.id = m.old_id;

CREATE TABLE payments_integer_tariff_ids AS payments;
ALTER TABLE payments_integer_tariff_ids DROP COLUMN tariff_id;
ALTER TABLE payments_integer_tariff_ids ADD COLUMN tariff_id UInt32;
INSERT INTO payments_integer_tariff_ids
SELECT p.* EXCEPT (tariff_id), m.new_id
FROM payments AS p INNER JOIN tariff_id_mapping_20261026 AS m ON p.tariff_id = m.old_id;

CREATE TABLE subscriptions_integer_tariff_ids AS subscriptions;
ALTER TABLE subscriptions_integer_tariff_ids DROP COLUMN tariff_id;
ALTER TABLE subscriptions_integer_tariff_ids ADD COLUMN tariff_id UInt32;
INSERT INTO subscriptions_integer_tariff_ids
SELECT s.* EXCEPT (tariff_id), m.new_id
FROM subscriptions AS s INNER JOIN tariff_id_mapping_20261026 AS m ON s.tariff_id = m.old_id;

RENAME TABLE
    tariffs TO tariffs_uuid_backup_20261026,
    tariffs_integer_ids TO tariffs,
    payments TO payments_uuid_tariff_backup_20261026,
    payments_integer_tariff_ids TO payments,
    subscriptions TO subscriptions_uuid_tariff_backup_20261026,
    subscriptions_integer_tariff_ids TO subscriptions;
