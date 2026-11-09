import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxRepository } from './outbox.repository.js';
import { NotificationsRabbitMqProducerService } from '../../core/rabbitmq/notifications-rabbitmq-producer.service.js';

@Injectable()
export class OutboxService {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly producer: NotificationsRabbitMqProducerService,
  ) {}

  save(event: { eventId: string; type: string; [key: string]: unknown }): Promise<void> {
    return this.outboxRepository.save(event);
  }

  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  async processPending(): Promise<void> {
    const events = await this.outboxRepository.findPending();
    await Promise.allSettled(
      events.map(async (record) => {
        const attempts = (record.attempts ?? 0) + 1;
        await this.outboxRepository.markProcessing(record.eventId, attempts);
        try {
          const event = JSON.parse(record.data!);
          await this.producer.publishToPayments(event);
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
  }

  @Cron('*/10 * * * * *', { waitForCompletion: true })
  recover(): Promise<void> {
    return this.outboxRepository.recover();
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  cleanup(): Promise<void> {
    return this.outboxRepository.cleanup();
  }
}
