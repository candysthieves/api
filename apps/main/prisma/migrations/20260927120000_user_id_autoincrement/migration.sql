BEGIN;

CREATE TEMPORARY TABLE "_UserIdMigration" ON COMMIT DROP AS
SELECT
  "id" AS "old_id",
  row_number() OVER (ORDER BY "created_at", "id")::INTEGER AS "new_id"
FROM "User";

CREATE UNIQUE INDEX "_UserIdMigration_old_id_idx"
  ON "_UserIdMigration" ("old_id");
CREATE UNIQUE INDEX "_UserIdMigration_new_id_idx"
  ON "_UserIdMigration" ("new_id");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "OAuthAccount" child
    LEFT JOIN "_UserIdMigration" mapping ON mapping."old_id" = child."user_id"
    WHERE mapping."old_id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "Post" child
    LEFT JOIN "_UserIdMigration" mapping ON mapping."old_id" = child."user_id"
    WHERE mapping."old_id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "Session" child
    LEFT JOIN "_UserIdMigration" mapping ON mapping."old_id" = child."user_id"
    WHERE mapping."old_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'User ID migration found a relational reference without a user mapping';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "InputEvent" event
    WHERE event."type" LIKE 'avatar.%'
      AND event."data" ? 'userId'
      AND NOT EXISTS (
        SELECT 1 FROM "_UserIdMigration" mapping
        WHERE mapping."old_id"::TEXT = event."data"->>'userId'
      )
  ) OR EXISTS (
    SELECT 1 FROM "OutputEvent" event
    WHERE event."type" LIKE 'avatar.%'
      AND event."data" ? 'userId'
      AND NOT EXISTS (
        SELECT 1 FROM "_UserIdMigration" mapping
        WHERE mapping."old_id"::TEXT = event."data"->>'userId'
      )
  ) THEN
    RAISE EXCEPTION 'User ID migration found an avatar event without a user mapping';
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN "id_new" INTEGER;
UPDATE "User" user_row
SET "id_new" = mapping."new_id"
FROM "_UserIdMigration" mapping
WHERE mapping."old_id" = user_row."id";
ALTER TABLE "User" ALTER COLUMN "id_new" SET NOT NULL;

ALTER TABLE "OAuthAccount" ADD COLUMN "user_id_new" INTEGER;
UPDATE "OAuthAccount" child
SET "user_id_new" = mapping."new_id"
FROM "_UserIdMigration" mapping
WHERE mapping."old_id" = child."user_id";
ALTER TABLE "OAuthAccount" ALTER COLUMN "user_id_new" SET NOT NULL;

ALTER TABLE "Post" ADD COLUMN "user_id_new" INTEGER;
UPDATE "Post" child
SET "user_id_new" = mapping."new_id"
FROM "_UserIdMigration" mapping
WHERE mapping."old_id" = child."user_id";
ALTER TABLE "Post" ALTER COLUMN "user_id_new" SET NOT NULL;

ALTER TABLE "Session" ADD COLUMN "user_id_new" INTEGER;
UPDATE "Session" child
SET "user_id_new" = mapping."new_id"
FROM "_UserIdMigration" mapping
WHERE mapping."old_id" = child."user_id";
ALTER TABLE "Session" ALTER COLUMN "user_id_new" SET NOT NULL;

UPDATE "InputEvent" event
SET "data" = jsonb_set(event."data", '{userId}', to_jsonb(mapping."new_id"), false)
FROM "_UserIdMigration" mapping
WHERE event."type" LIKE 'avatar.%'
  AND event."data" ? 'userId'
  AND mapping."old_id"::TEXT = event."data"->>'userId';

UPDATE "OutputEvent" event
SET "data" = jsonb_set(event."data", '{userId}', to_jsonb(mapping."new_id"), false)
FROM "_UserIdMigration" mapping
WHERE event."type" LIKE 'avatar.%'
  AND event."data" ? 'userId'
  AND mapping."old_id"::TEXT = event."data"->>'userId';

ALTER TABLE "OAuthAccount" DROP CONSTRAINT "OAuthAccount_user_id_fkey";
ALTER TABLE "Post" DROP CONSTRAINT "Post_user_id_fkey";
ALTER TABLE "Session" DROP CONSTRAINT "Session_user_id_fkey";
DROP INDEX "OAuthAccount_user_id_idx";
DROP INDEX "Post_user_id_idx";

ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

ALTER TABLE "OAuthAccount" DROP COLUMN "user_id";
ALTER TABLE "OAuthAccount" RENAME COLUMN "user_id_new" TO "user_id";
ALTER TABLE "Post" DROP COLUMN "user_id";
ALTER TABLE "Post" RENAME COLUMN "user_id_new" TO "user_id";
ALTER TABLE "Session" DROP COLUMN "user_id";
ALTER TABLE "Session" RENAME COLUMN "user_id_new" TO "user_id";

CREATE SEQUENCE "User_id_seq" AS INTEGER;
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT nextval('"User_id_seq"');
ALTER SEQUENCE "User_id_seq" OWNED BY "User"."id";
SELECT setval('"User_id_seq"', COALESCE(MAX("id"), 1), COUNT(*) > 0) FROM "User";

CREATE INDEX "OAuthAccount_user_id_idx" ON "OAuthAccount"("user_id");
CREATE INDEX "Post_user_id_idx" ON "Post"("user_id");

ALTER TABLE "OAuthAccount"
  ADD CONSTRAINT "OAuthAccount_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post"
  ADD CONSTRAINT "Post_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session"
  ADD CONSTRAINT "Session_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
