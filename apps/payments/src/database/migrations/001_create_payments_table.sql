CREATE TABLE IF NOT EXISTS payments
(
    id UUID DEFAULT generateUUIDv4(),
    provider Enum8('STRIPE' = 1, 'YOOKASSA' = 2),
    created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (created_at, id);
