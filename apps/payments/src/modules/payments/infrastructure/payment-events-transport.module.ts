import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentEventsTransport } from './payment-events-transport.service.js';

// Настраивает RabbitMQ и объявляет durable-очередь для событий платежей в main.
@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('RABBITMQ_URL'),
        prefetchCount: configService.getOrThrow<number>(
          'RABBITMQ_PREFETCH_COUNT',
        ),
        enableDirectReplyTo: false,
        queues: [
          {
            name: `${configService.getOrThrow<string>('RABBITMQ_FILES_TO_MAIN_QUEUE')}.payments.status`,
            options: { durable: true },
          },
        ],
      }),
    }),
  ],
  providers: [PaymentEventsTransport],
  exports: [PaymentEventsTransport],
})
export class PaymentEventsTransportModule {}
