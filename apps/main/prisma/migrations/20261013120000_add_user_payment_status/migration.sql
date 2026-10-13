-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Personal', 'Business');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'Personal';
