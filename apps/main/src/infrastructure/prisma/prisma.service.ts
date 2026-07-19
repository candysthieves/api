import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.get('DATABASE_URL') as string,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Database connected');
  }
}
