import { Module } from '@nestjs/common';
import { PaymentsModule } from '../modules/payments/payments.module.js';
import { PaymentStatusService } from '../modules/payments/application/services/payment-status.service.js';
import { InboxRepository } from './inbox/inbox.repository.js';
import { OutboxRepository } from './outbox/outbox.repository.js';
import { PaymentEventsConsumer } from './payment-events.consumer.js';
import { InboxService } from './inbox/inbox.service.js';
import { OutboxService } from './outbox/outbox.service.js';
import { PaymentEventsScheduler } from './payment-events.scheduler.js';
import { RabbitMqModule } from '../core/rabbitmq/rabbitmq.module.js';

@Module({
  imports: [PaymentsModule, RabbitMqModule],
  providers: [
    InboxRepository,
    OutboxRepository,
    PaymentStatusService,
    PaymentEventsConsumer,
    InboxService,
    OutboxService,
    PaymentEventsScheduler,
  ],
})
export class PaymentEventsModule {}
