import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsConfig {
  readonly port: number;
  readonly tcpHost: string;
  readonly tcpPort: number;
  readonly redisHost: string;
  readonly redisPort: number;
  readonly redisPassword?: string;

  constructor(configService: ConfigService) {
    this.port = configService.getOrThrow<number>('PORT');
    this.tcpHost = configService.getOrThrow<string>('TCP_HOST');
    this.tcpPort = configService.getOrThrow<number>('TCP_PORT');
    this.redisHost = configService.getOrThrow<string>('REDIS_HOST');
    this.redisPort = configService.getOrThrow<number>('REDIS_PORT');
    this.redisPassword =
      configService.get<string>('REDIS_PASSWORD') || undefined;
  }
}
