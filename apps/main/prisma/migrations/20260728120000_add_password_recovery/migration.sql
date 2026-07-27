ALTER TABLE "User"
ADD COLUMN "password_recovery_code" TEXT,
ADD COLUMN "password_recovery_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_password_recovery_code_key"
ON "User"("password_recovery_code");
