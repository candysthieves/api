import { Injectable, Logger } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type { PaymentWebhookEvent } from '@libs/contracts';
import { InboxService } from './inbox/inbox.service.js';

@Injectable()
export class PaymentEventsConsumer {
  private readonly logger = new Logger(PaymentEventsConsumer.name);

  constructor(private readonly inboxService: InboxService) {}

  @RabbitSubscribe({ name: 'paymentStatusRequests' })
  async accept(event: PaymentWebhookEvent): Promise<void | Nack> {
    this.logger.log(
      `Received payment status request event: eventId=${event?.eventId}, externalPaymentId=${event?.data?.externalPaymentId}`,
    );
    try {
      await this.inboxService.accept(event);
    } catch (error) {
      this.logger.error(
        `Failed to save event to inbox: eventId=${event?.eventId}`,
        error instanceof Error ? error.stack : error,
      );
      return new Nack(true);
    }
  }
}
