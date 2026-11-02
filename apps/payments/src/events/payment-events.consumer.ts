import { Injectable } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type { PaymentWebhookEvent } from '@libs/contracts';
import { InboxService } from './inbox/inbox.service.js';

@Injectable()
export class PaymentEventsConsumer {
  constructor(private readonly inboxService: InboxService) {}

  @RabbitSubscribe({ name: 'paymentStatusRequests' })
  async accept(event: PaymentWebhookEvent): Promise<void | Nack> {
    try {
      await this.inboxService.accept(event);
    } catch {
      return new Nack(true);
    }
  }
}
