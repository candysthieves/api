BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User")
    OR EXISTS (SELECT 1 FROM "OAuthAccount")
    OR EXISTS (SELECT 1 FROM "Post")
    OR EXISTS (SELECT 1 FROM "Session") THEN
    RAISE EXCEPTION 'User ID migration requires empty User, OAuthAccount, Post, and Session tables';
  END IF;
END $$;

ALTER TABLE "OAuthAccount" DROP CONSTRAINT "OAuthAccount_user_id_fkey";
ALTER TABLE "Post" DROP CONSTRAINT "Post_user_id_fkey";
ALTER TABLE "Session" DROP CONSTRAINT "Session_user_id_fkey";

DROP INDEX "OAuthAccount_user_id_idx";
DROP INDEX "Post_user_id_idx";

ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

ALTER TABLE "OAuthAccount" DROP COLUMN "user_id";
ALTER TABLE "OAuthAccount" ADD COLUMN "user_id" INTEGER NOT NULL;
ALTER TABLE "Post" DROP COLUMN "user_id";
ALTER TABLE "Post" ADD COLUMN "user_id" INTEGER NOT NULL;
ALTER TABLE "Session" DROP COLUMN "user_id";
ALTER TABLE "Session" ADD COLUMN "user_id" INTEGER NOT NULL;

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
