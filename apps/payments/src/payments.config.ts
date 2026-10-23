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
  readonly stripeSecretKey: string;
  readonly stripeWebhookSecret: string;
  readonly frontendUrl: string;
  readonly yooKassaShopId: string;
  readonly yooKassaSecretKey: string;

  constructor(configService: ConfigService) {
    this.port = configService.getOrThrow<number>('PORT');
    this.tcpHost = configService.getOrThrow<string>('TCP_HOST');
    this.tcpPort = configService.getOrThrow<number>('TCP_PORT');
    this.clickhouseHost = configService.getOrThrow<string>('CLICKHOUSE_HOST');
    this.clickhouseUser = configService.getOrThrow<string>('CLICKHOUSE_USER');
    this.clickhousePassword = configService.getOrThrow<string>(
      'CLICKHOUSE_PASSWORD',
    );
    this.clickhouseDatabase = configService.getOrThrow<string>(
      'CLICKHOUSE_DATABASE',
    );
    this.stripeSecretKey =
      configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.stripeWebhookSecret = configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    this.frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
    this.yooKassaShopId = configService.getOrThrow<string>('YOOKASSA_SHOP_ID');
    this.yooKassaSecretKey = configService.getOrThrow<string>(
      'YOOKASSA_SECRET_KEY',
    );
  }
}
