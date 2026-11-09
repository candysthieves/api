import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { InboxRepository } from './inbox/inbox.repository.js';
import { InboxService } from './inbox/inbox.service.js';
import { OutboxRepository } from './outbox/outbox.repository.js';
import { OutboxService } from './outbox/outbox.service.js';
import { NotificationEventsConsumer } from './notification-events.consumer.js';
import { RabbitMqModule } from '../core/rabbitmq/rabbitmq.module.js';

@Module({
  imports: [CqrsModule, ScheduleModule, RabbitMqModule],
  providers: [
    InboxRepository,
    InboxService,
    OutboxRepository,
    OutboxService,
    NotificationEventsConsumer,
  ],
  exports: [InboxService, OutboxService],
})
export class NotificationEventsModule {}
