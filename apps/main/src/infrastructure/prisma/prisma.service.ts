import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(private readonly configService: ConfigService) {
    // 👈 Достаем переменную через ConfigService
    const connectionString = configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in .env');
    }

    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow('DATABASE_URL'),
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Database connected');
  }
}
