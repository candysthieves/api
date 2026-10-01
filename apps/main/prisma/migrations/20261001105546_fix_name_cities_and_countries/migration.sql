/*
  Warnings:

  - You are about to drop the `_cities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_countries` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_cities" DROP CONSTRAINT "_cities_country_id_fkey";

-- DropTable
DROP TABLE "_cities";

-- DropTable
DROP TABLE "_countries";

-- CreateTable
CREATE TABLE "Country" (
    "country_id" INTEGER NOT NULL,
    "country_name_ru" VARCHAR(150) NOT NULL,
    "country_name_en" VARCHAR(150) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("country_id")
);

-- CreateTable
CREATE TABLE "City" (
    "city_id" INTEGER NOT NULL,
    "country_id" INTEGER NOT NULL,
    "city_name_ru" VARCHAR(150) NOT NULL,
    "city_name_en" VARCHAR(150) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("city_id")
);

-- CreateIndex
CREATE INDEX "City_country_id_idx" ON "City"("country_id");

-- CreateIndex
CREATE INDEX "City_city_name_ru_idx" ON "City"("city_name_ru");

-- CreateIndex
CREATE INDEX "City_city_name_en_idx" ON "City"("city_name_en");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "Country"("country_id") ON DELETE CASCADE ON UPDATE CASCADE;
