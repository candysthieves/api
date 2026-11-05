import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { NotificationsConfig } from '../../notifications.config.js';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [NotificationsConfig],
      useFactory: (config: NotificationsConfig) => {
        const inbox = config.rabbitmqPaymentsToNotificationsQueue;
        const outbox = config.rabbitmqNotificationsToPaymentsQueue;

        return {
          uri: config.rabbitmqUrl,
          prefetchCount: 10,
          enableDirectReplyTo: false,
          queues: [
            { name: inbox, options: { durable: true } },
            { name: outbox, options: { durable: true } },
          ],
        };
      },
    }),
  ],
  exports: [RabbitMQModule],
})
export class RabbitMqModule {}
