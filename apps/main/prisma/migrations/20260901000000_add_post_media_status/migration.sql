CREATE TYPE "MediaStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

ALTER TABLE "Post"
ADD COLUMN "media_status" "MediaStatus" NOT NULL DEFAULT 'PROCESSING',
ADD COLUMN "media_error" TEXT;

UPDATE "Post"
SET "media_status" = 'READY'
WHERE jsonb_array_length("images") > 0;
