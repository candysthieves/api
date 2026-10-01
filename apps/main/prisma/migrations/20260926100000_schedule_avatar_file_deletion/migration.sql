CREATE TABLE "avatar_file_deletion" (
    "file_id" TEXT NOT NULL,
    "delete_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avatar_file_deletion_pkey" PRIMARY KEY ("file_id")
);

CREATE INDEX "avatar_file_deletion_delete_at_idx"
ON "avatar_file_deletion"("delete_at");
