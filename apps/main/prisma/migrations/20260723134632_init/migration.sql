/*
  Warnings:

  - You are about to drop the column `deviceName` on the `Session` table. All the data in the column will be lost.
  - Added the required column `device_name` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `confirmation_code` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `confirmation_expires_at` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Session" DROP COLUMN "deviceName",
ADD COLUMN     "device_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "confirmation_code" TEXT NOT NULL,
ADD COLUMN     "confirmation_expires_at" TIMESTAMP(3) NOT NULL;
