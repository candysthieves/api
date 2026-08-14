-- Приводим историческую схему к текущей Prisma-модели.
-- DEFAULT нужен только для заполнения уже существующих записей.
ALTER TABLE "OAuthAccount"
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "User"
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "confirmation_code" DROP NOT NULL;

ALTER TABLE "OAuthAccount"
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "User"
ALTER COLUMN "updated_at" DROP DEFAULT;
