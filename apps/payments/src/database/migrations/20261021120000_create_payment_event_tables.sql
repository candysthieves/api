CREATE TABLE IF NOT EXISTS payment_inbox
(
  event_id UUID,
  type String,
  data String,
  status Enum8('UNPROCESSED' = 1, 'PROCESSING' = 2, 'OK' = 3, 'ERROR' = 4),
  attempts UInt8 DEFAULT 0,
  created_at DateTime64(3) DEFAULT now64(3),
  updated_at DateTime64(3) DEFAULT now64(3),
  processing_started_at Nullable(DateTime64(3)),
  next_attempt_at Nullable(DateTime64(3)),
  completed_at Nullable(DateTime64(3)),
  last_error Nullable(String)
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY event_id;

CREATE TABLE IF NOT EXISTS payment_outbox
(
  event_id UUID,
  type String,
  data String,
  status Enum8('UNPROCESSED' = 1, 'PROCESSING' = 2, 'OK' = 3, 'ERROR' = 4),
  attempts UInt8 DEFAULT 0,
  created_at DateTime64(3) DEFAULT now64(3),
  updated_at DateTime64(3) DEFAULT now64(3),
  processing_started_at Nullable(DateTime64(3)),
  next_attempt_at Nullable(DateTime64(3)),
  completed_at Nullable(DateTime64(3)),
  last_error Nullable(String)
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY event_id;
