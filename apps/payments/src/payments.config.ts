import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsConfig {
  readonly port: number;
  readonly tcpHost: string;
  readonly tcpPort: number;
  readonly clickhouseHost: string;
  readonly clickhouseUser: string;
  readonly clickhousePassword: string;
  readonly clickhouseDatabase: string;

  constructor(configService: ConfigService) {
    this.port = configService.getOrThrow<number>('PORT');
    this.tcpHost = configService.getOrThrow<string>('TCP_HOST');
    this.tcpPort = configService.getOrThrow<number>('TCP_PORT');
    this.clickhouseHost = configService.getOrThrow<string>('CLICKHOUSE_HOST');
    this.clickhouseUser = configService.getOrThrow<string>('CLICKHOUSE_USER');
    this.clickhousePassword =
      configService.get<string>('CLICKHOUSE_PASSWORD') ?? '';
    this.clickhouseDatabase = configService.getOrThrow<string>(
      'CLICKHOUSE_DATABASE',
    );
  }
}
