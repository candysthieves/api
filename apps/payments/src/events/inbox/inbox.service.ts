import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { PaymentWebhookEvent } from '@libs/contracts';
import { InboxRepository } from './inbox.repository.js';
import { PaymentStatusService } from '../../modules/payments/application/services/payment-status.service.js';

@Injectable()
export class InboxService {
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
    const results = await Promise.allSettled(
      events.map(async (record) => {
        const attempts = (record.attempts ?? 0) + 1;
        await this.inboxRepository.markProcessing(record.eventId, attempts);
        try {
          const event = JSON.parse(record.data!) as PaymentWebhookEvent;
          await this.paymentStatusService.process(event.data.externalPaymentId);
          await this.inboxRepository.markCompleted(record.eventId);
        } catch (error) {
          await this.inboxRepository.markFailed(
            record.eventId,
            attempts,
            error,
          );
        }
      }),
    );
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
  }
}
