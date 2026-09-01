ALTER TABLE "Post" RENAME COLUMN "deleted_at" TO "will_be_deleted";

CREATE INDEX "Post_will_be_deleted_idx" ON "Post"("will_be_deleted");
