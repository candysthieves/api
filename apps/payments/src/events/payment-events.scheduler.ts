import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InboxRepository } from './inbox/inbox.repository.js';
import { OutboxRepository } from './outbox/outbox.repository.js';
import { PaymentStatusService } from '../modules/payments/application/services/payment-status.service.js';

@Injectable()
export class PaymentEventsScheduler {
  constructor(
    private readonly inboxRepository: InboxRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly paymentStatusService: PaymentStatusService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS, { waitForCompletion: true })
  async recover(): Promise<void> {
    await this.inboxRepository.recover();
    await this.outboxRepository.recover();
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  async cleanup(): Promise<void> {
    await this.inboxRepository.cleanup();
    await this.outboxRepository.cleanup();
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { waitForCompletion: true })
  cancelExpired(): Promise<void> {
    return this.paymentStatusService.cancelExpired();
  }
}
