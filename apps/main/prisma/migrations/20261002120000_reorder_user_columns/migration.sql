BEGIN;

CREATE SEQUENCE "User_reordered_id_seq" AS INTEGER;

CREATE TABLE "User_reordered" (
    "id" INTEGER NOT NULL DEFAULT nextval('"User_reordered_id_seq"'),
    "user_name" TEXT NOT NULL,
    "first_name" TEXT,
    "second_name" TEXT,
    "password" TEXT NOT NULL,
    "is_email_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmation_code" TEXT,
    "email" TEXT NOT NULL,
    "confirmation_expires_at" TIMESTAMP(3) NOT NULL,
    "password_recovery_code" TEXT,
    "password_recovery_expires_at" TIMESTAMP(3),
    "avatar" JSONB,
    "avatar_preview" JSONB,
    "country_id" INTEGER,
    "city_id" INTEGER,
    "about_me" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "terms_accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_reordered_pkey" PRIMARY KEY ("id")
);

INSERT INTO "User_reordered" (
    "id",
    "user_name",
    "first_name",
    "second_name",
    "password",
    "is_email_confirmed",
    "confirmation_code",
    "email",
    "confirmation_expires_at",
    "password_recovery_code",
    "password_recovery_expires_at",
    "avatar",
    "avatar_preview",
    "country_id",
    "city_id",
    "about_me",
    "date_of_birth",
    "terms_accepted_at",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "username",
    "first_name",
    "last_name",
    "password",
    "is_email_confirmed",
    "confirmation_code",
    "email",
    "confirmation_expires_at",
    "password_recovery_code",
    "password_recovery_expires_at",
    "avatar",
    "avatar_preview",
    "country_id",
    "city_id",
    "about_me",
    "date_of_birth",
    "terms_accepted_at",
    "created_at",
    "updated_at"
FROM "User";

SELECT setval(
    '"User_reordered_id_seq"',
    COALESCE(MAX("id"), 1),
    COUNT(*) > 0
)
FROM "User_reordered";

ALTER TABLE "OAuthAccount" DROP CONSTRAINT "OAuthAccount_user_id_fkey";
ALTER TABLE "Post" DROP CONSTRAINT "Post_user_id_fkey";
ALTER TABLE "Session" DROP CONSTRAINT "Session_user_id_fkey";

DROP TABLE "User";
ALTER TABLE "User_reordered" RENAME TO "User";
ALTER TABLE "User" RENAME CONSTRAINT "User_reordered_pkey" TO "User_pkey";
ALTER SEQUENCE "User_reordered_id_seq" OWNED BY "User"."id";
ALTER SEQUENCE "User_reordered_id_seq" RENAME TO "User_id_seq";

CREATE UNIQUE INDEX "User_user_name_key" ON "User"("user_name");
CREATE UNIQUE INDEX "User_confirmation_code_key" ON "User"("confirmation_code");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_password_recovery_code_key" ON "User"("password_recovery_code");

ALTER TABLE "User"
    ADD CONSTRAINT "User_country_id_fkey"
    FOREIGN KEY ("country_id") REFERENCES "Country"("country_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User"
    ADD CONSTRAINT "User_city_id_fkey"
    FOREIGN KEY ("city_id") REFERENCES "City"("city_id") ON DELETE SET NULL ON UPDATE CASCADE;
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
