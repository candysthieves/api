import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { PaymentsRabbitMqProducerService } from './payments-rabbitmq-producer.service.js';

@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const inbox = config.getOrThrow<string>(
          'RABBITMQ_MAIN_TO_PAYMENTS_QUEUE',
        );
        const outbox = config.getOrThrow<string>(
          'RABBITMQ_PAYMENTS_TO_MAIN_QUEUE',
        );
        return {
          uri: config.getOrThrow<string>('RABBITMQ_URL'),
          prefetchCount: 10,
          enableDirectReplyTo: false,
          queues: [
            { name: inbox, options: { durable: true } },
            { name: outbox, options: { durable: true } },
          ],
          handlers: {
            paymentStatusRequests: {
              exchange: '',
              routingKey: inbox,
              queue: inbox,
              queueOptions: { durable: true },
            },
          },
        };
      },
    }),
  ],
  providers: [PaymentsRabbitMqProducerService],
  exports: [PaymentsRabbitMqProducerService],
})
export class RabbitMqModule {}
