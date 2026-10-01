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
}
