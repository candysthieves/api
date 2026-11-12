import { Module } from '@nestjs/common';
import { PaymentsModule } from '../modules/payments/payments.module.js';
import { PaymentStatusService } from '../modules/payments/application/services/payment-status.service.js';
import { InboxRepository } from './inbox/inbox.repository.js';
import { OutboxModule } from './outbox/outbox.module.js';
import { PaymentEventsConsumer } from './payment-events.consumer.js';
import { InboxService } from './inbox/inbox.service.js';
import { PaymentEventsScheduler } from './payment-events.scheduler.js';
import { RabbitMqModule } from '../core/rabbitmq/rabbitmq.module.js';

@Module({
  imports: [PaymentsModule, RabbitMqModule, OutboxModule],
  providers: [
    InboxRepository,
    PaymentStatusService,
    PaymentEventsConsumer,
    InboxService,
    PaymentEventsScheduler,
  ],
})
export class PaymentEventsModule {}
