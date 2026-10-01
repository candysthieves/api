-- CreateTable
CREATE TABLE "_countries" (
    "country_id" INTEGER NOT NULL,
    "country_name_ru" VARCHAR(150) NOT NULL,
    "country_name_en" VARCHAR(150) NOT NULL,

    CONSTRAINT "_countries_pkey" PRIMARY KEY ("country_id")
);

-- CreateTable
CREATE TABLE "_cities" (
    "city_id" INTEGER NOT NULL,
    "country_id" INTEGER NOT NULL,
    "city_name_ru" VARCHAR(150) NOT NULL,
    "city_name_en" VARCHAR(150) NOT NULL,

    CONSTRAINT "_cities_pkey" PRIMARY KEY ("city_id")
);

-- CreateIndex
CREATE INDEX "_cities_country_id_idx" ON "_cities"("country_id");

-- CreateIndex
CREATE INDEX "_cities_city_name_ru_idx" ON "_cities"("city_name_ru");

-- CreateIndex
CREATE INDEX "_cities_city_name_en_idx" ON "_cities"("city_name_en");

-- AddForeignKey
ALTER TABLE "_cities" ADD CONSTRAINT "_cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "_countries"("country_id") ON DELETE CASCADE ON UPDATE CASCADE;
