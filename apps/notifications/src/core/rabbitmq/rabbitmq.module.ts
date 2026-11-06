import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { NotificationsConfig } from '../../notifications.config.js';
import { NotificationsRabbitMqProducerService } from './notifications-rabbitmq-producer.service.js';

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
  providers: [NotificationsRabbitMqProducerService],
  exports: [RabbitMQModule, NotificationsRabbitMqProducerService],
})
export class RabbitMqModule {}
