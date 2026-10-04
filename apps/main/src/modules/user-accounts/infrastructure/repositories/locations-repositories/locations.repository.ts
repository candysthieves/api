import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class LocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCountries(
    sortBy?: 'countryId' | 'countryNameRu' | 'countryNameEn',
    sortDirection?: 'asc' | 'desc',
  ) {
    return this.prisma.country.findMany({
      ...(sortBy && sortDirection
        ? { orderBy: { [sortBy]: sortDirection } }
        : {}),
    });
  }

  async getCities(
    countryId: number,
    sortBy?: 'cityId' | 'cityNameRu' | 'cityNameEn',
    sortDirection?: 'asc' | 'desc',
  ) {
    return this.prisma.city.findMany({
      where: { countryId },
      ...(sortBy && sortDirection
        ? { orderBy: { [sortBy]: sortDirection } }
        : {}),
    });
  }

  async findCountryById(countryId: number) {
    return this.prisma.country.findUnique({ where: { countryId } });
  }

  async findCityById(cityId: number) {
    return this.prisma.city.findUnique({ where: { cityId } });
  }
}
