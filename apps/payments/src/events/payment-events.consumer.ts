import { Injectable, Logger } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type { PaymentWebhookEvent } from '@libs/contracts';
import { InboxService } from './inbox/inbox.service.js';

@Injectable()
export class PaymentEventsConsumer {
  private readonly logger = new Logger(PaymentEventsConsumer.name);
  constructor(private readonly inbox: InboxService) {}

  @RabbitSubscribe({ name: 'paymentStatusRequests' })
  async accept(event: PaymentWebhookEvent): Promise<void | Nack> {
    try {
      await this.inbox.accept(event);
    } catch {
      this.logger.error(`Payment inbox persistence failed: ${event.eventId}`);
      return new Nack(true);
    }
  }
}
