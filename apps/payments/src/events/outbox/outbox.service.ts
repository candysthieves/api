import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { PaymentResultEvent } from '@libs/contracts';
import { OutboxRepository } from './outbox.repository.js';
import { PaymentsRabbitMqProducerService } from '../../core/rabbitmq/payments-rabbitmq-producer.service.js';

@Injectable()
export class OutboxService {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly producer: PaymentsRabbitMqProducerService,
  ) {}

  save(event: PaymentResultEvent): Promise<void> {
    return this.outboxRepository.save(event);
  }

  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  async processPending(): Promise<void> {
    const events = await this.outboxRepository.findPending();
    const results = await Promise.allSettled(
      events.map(async (record) => {
        const attempts = (record.attempts ?? 0) + 1;
        await this.outboxRepository.markProcessing(record.eventId, attempts);
        try {
          const event = JSON.parse(record.data!) as PaymentResultEvent;
          await this.producer.publishPaymentResult(event);
          await this.outboxRepository.markCompleted(record.eventId);
        } catch (error) {
          await this.outboxRepository.markFailed(
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
