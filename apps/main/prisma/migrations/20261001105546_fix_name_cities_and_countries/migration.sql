-- Rename Tables
ALTER TABLE "_countries" RENAME TO "Country";
ALTER TABLE "_cities" RENAME TO "City";

-- Rename Primary Key Constraints
ALTER TABLE "Country" RENAME CONSTRAINT "_countries_pkey" TO "Country_pkey";
ALTER TABLE "City" RENAME CONSTRAINT "_cities_pkey" TO "City_pkey";

-- Rename Indexes
ALTER INDEX "_cities_country_id_idx" RENAME TO "City_country_id_idx";
ALTER INDEX "_cities_city_name_ru_idx" RENAME TO "City_city_name_ru_idx";
ALTER INDEX "_cities_city_name_en_idx" RENAME TO "City_city_name_en_idx";

-- Rename Foreign Key Constraint between City and Country
ALTER TABLE "City" RENAME CONSTRAINT "_cities_country_id_fkey" TO "City_country_id_fkey";
