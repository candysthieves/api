import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsConfig {
  readonly port: number;
  readonly tcpHost: string;
  readonly tcpPort: number;
  readonly redisHost: string;
  readonly mainTcpHost: string;
  readonly mainTcpPort: number;
  readonly redisPort: number;
  readonly redisPassword?: string;
  readonly rabbitmqUrl: string;
  readonly rabbitmqPaymentsToNotificationsQueue: string;
  readonly rabbitmqNotificationsToPaymentsQueue: string;

  constructor(configService: ConfigService) {
    this.port = configService.getOrThrow<number>('PORT');
    this.tcpHost = configService.getOrThrow<string>('TCP_HOST');
    this.tcpPort = configService.getOrThrow<number>('TCP_PORT');
    this.redisHost = configService.getOrThrow<string>('REDIS_HOST');
    this.mainTcpHost = configService.get<string>('MAIN_TCP_HOST', '127.0.0.1');
    this.mainTcpPort = Number(configService.get<number>('MAIN_TCP_PORT', 4004));
    this.redisPort = configService.getOrThrow<number>('REDIS_PORT');
    this.redisPassword =
      configService.get<string>('REDIS_PASSWORD') || undefined;
    this.rabbitmqUrl = configService.getOrThrow<string>('RABBITMQ_URL');
    this.rabbitmqPaymentsToNotificationsQueue =
      configService.getOrThrow<string>(
        'RABBITMQ_PAYMENTS_TO_NOTIFICATIONS_QUEUE',
      );
    this.rabbitmqNotificationsToPaymentsQueue =
      configService.getOrThrow<string>(
        'RABBITMQ_NOTIFICATIONS_TO_PAYMENTS_QUEUE',
      );
  }
}
