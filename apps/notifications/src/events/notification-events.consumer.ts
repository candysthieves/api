import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type { PaymentNotificationEvent } from '@libs/contracts';
import { InboxService } from './inbox/inbox.service.js';

@Injectable()
export class NotificationEventsConsumer {
  constructor(private readonly inboxService: InboxService) {}

  @RabbitSubscribe({
    exchange: '',
    routingKey: 'payments-to-notifications',
    queue: 'payments-to-notifications',
    queueOptions: { durable: true },
  })
  async handlePaymentNotification(
    event: PaymentNotificationEvent,
  ): Promise<void> {
    await this.inboxService.accept(event);
  }
}
