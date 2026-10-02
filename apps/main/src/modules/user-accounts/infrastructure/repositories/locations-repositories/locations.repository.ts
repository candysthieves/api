import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class LocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCountries() {
    return this.prisma.country.findMany();
  }

  async getCities(countryId: number) {
    return this.prisma.city.findMany({ where: { countryId } });
  }

  async findCountryById(countryId: number) {
    return this.prisma.country.findUnique({ where: { countryId } });
  }

  async findCityById(cityId: number) {
    return this.prisma.city.findUnique({ where: { cityId } });
  }
}
