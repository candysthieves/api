/*
  Warnings:

  - The values [SENDED] on the enum `EventStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EventStatus_new" AS ENUM ('UNPROCESSED', 'PROCESSING', 'OK', 'ERROR');
ALTER TABLE "public"."InputEvent" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."OutputEvent" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "OutputEvent" ALTER COLUMN "status" TYPE "EventStatus_new" USING ("status"::text::"EventStatus_new");
ALTER TABLE "InputEvent" ALTER COLUMN "status" TYPE "EventStatus_new" USING ("status"::text::"EventStatus_new");
ALTER TYPE "EventStatus" RENAME TO "EventStatus_old";
ALTER TYPE "EventStatus_new" RENAME TO "EventStatus";
DROP TYPE "public"."EventStatus_old";
ALTER TABLE "InputEvent" ALTER COLUMN "status" SET DEFAULT 'UNPROCESSED';
ALTER TABLE "OutputEvent" ALTER COLUMN "status" SET DEFAULT 'UNPROCESSED';
COMMIT;

-- AlterTable
ALTER TABLE "InputEvent" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OutputEvent" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "id" DROP DEFAULT;
