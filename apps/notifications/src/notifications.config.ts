import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsConfig {
  readonly port: number;
  readonly tcpHost: string;
  readonly tcpPort: number;

  constructor(configService: ConfigService) {
    this.port = configService.getOrThrow<number>('PORT');
    this.tcpHost = configService.getOrThrow<string>('TCP_HOST');
    this.tcpPort = configService.getOrThrow<number>('TCP_PORT');
  }
}
