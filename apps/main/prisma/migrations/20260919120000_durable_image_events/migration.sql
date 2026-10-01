ALTER TABLE "OutputEvent" DROP CONSTRAINT "OutputEvent_pkey";
ALTER TABLE "OutputEvent" DROP CONSTRAINT IF EXISTS "OutputEvent_event_id_key";
DROP INDEX IF EXISTS "OutputEvent_event_id_key";
ALTER TABLE "OutputEvent" DROP COLUMN "id", ADD PRIMARY KEY ("event_id"),
  ALTER COLUMN "consumer" DROP NOT NULL, ALTER COLUMN "type" DROP NOT NULL,
  ALTER COLUMN "data" DROP NOT NULL, ALTER COLUMN "attempts" DROP NOT NULL,
  ALTER COLUMN "created_at" DROP NOT NULL,
  ADD COLUMN "body" BYTEA, ADD COLUMN "processing_started_at" TIMESTAMP(3),
  ADD COLUMN "completed_at" TIMESTAMP(3);
UPDATE "OutputEvent" SET "completed_at" = COALESCE("updated_at", CURRENT_TIMESTAMP) WHERE "status" IN ('OK', 'ERROR');
ALTER TABLE "OutputEvent" DROP COLUMN "updated_at";
CREATE INDEX "OutputEvent_status_processing_started_at_idx" ON "OutputEvent" ("status", "processing_started_at");
CREATE INDEX "OutputEvent_status_completed_at_idx" ON "OutputEvent" ("status", "completed_at");

ALTER TABLE "InputEvent" DROP CONSTRAINT "InputEvent_pkey";
ALTER TABLE "InputEvent" DROP CONSTRAINT IF EXISTS "InputEvent_event_id_key";
DROP INDEX IF EXISTS "InputEvent_event_id_key";
ALTER TABLE "InputEvent" DROP COLUMN "id", ADD PRIMARY KEY ("event_id"),
  ALTER COLUMN "consumer" DROP NOT NULL, ALTER COLUMN "type" DROP NOT NULL,
  ALTER COLUMN "data" DROP NOT NULL, ALTER COLUMN "attempts" DROP NOT NULL,
  ALTER COLUMN "created_at" DROP NOT NULL,
  ADD COLUMN "body" BYTEA, ADD COLUMN "processing_started_at" TIMESTAMP(3),
  ADD COLUMN "completed_at" TIMESTAMP(3);
UPDATE "InputEvent" SET "completed_at" = COALESCE("updated_at", CURRENT_TIMESTAMP) WHERE "status" IN ('OK', 'ERROR');
ALTER TABLE "InputEvent" DROP COLUMN "updated_at";
CREATE INDEX "InputEvent_status_processing_started_at_idx" ON "InputEvent" ("status", "processing_started_at");
CREATE INDEX "InputEvent_status_completed_at_idx" ON "InputEvent" ("status", "completed_at");
