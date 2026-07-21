import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfig {
  readonly port: number;
  readonly databaseUrl: string;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.port = Number(configService.getOrThrow('PORT'));
    this.databaseUrl = configService.getOrThrow('DATABASE_URL');
  }
}
