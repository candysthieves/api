import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { PaymentWebhookEvent } from '@libs/contracts';
import { InboxRepository } from './inbox.repository.js';
import { PaymentStatusService } from '../../modules/payments/application/services/payment-status.service.js';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly inboxRepository: InboxRepository,
    private readonly paymentStatusService: PaymentStatusService,
  ) {}

  accept(event: PaymentWebhookEvent): Promise<void> {
    return this.inboxRepository.save(event);
  }

  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  async processPending(): Promise<void> {
    const events = await this.inboxRepository.findPending();
    await Promise.allSettled(
      events.map(async (record) => {
        const attempts = (record.attempts ?? 0) + 1;
        await this.inboxRepository.markProcessing(record.eventId, attempts);
        try {
          const event = JSON.parse(record.data!) as PaymentWebhookEvent;
          this.logger.log(
            `Processing inbox event: eventId=${record.eventId}, externalPaymentId=${event.data.externalPaymentId}`,
          );
          await this.paymentStatusService.process(event.data.externalPaymentId);
          await this.inboxRepository.markCompleted(record.eventId);
          this.logger.log(
            `Successfully processed inbox event: eventId=${record.eventId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process inbox event: eventId=${record.eventId}, attempts=${attempts}`,
            error instanceof Error ? error.stack : error,
          );
          await this.inboxRepository.markFailed(
            record.eventId,
            attempts,
            error,
          );
        }
      }),
    );
  }
}
