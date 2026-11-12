import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type {
  PaymentNotificationEvent,
  PaymentResultEvent,
} from '@libs/contracts';
import { OutboxRepository } from './outbox.repository.js';
import { PaymentsRabbitMqProducerService } from '../../core/rabbitmq/payments-rabbitmq-producer.service.js';
import type { PaymentEventTable } from '../payment-event.type.js';

type PendingOutboxEvent = {
  record: PaymentEventTable;
  event: PaymentResultEvent | PaymentNotificationEvent;
};

@Injectable()
export class OutboxService {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly paymentsRabbitMqProducerService: PaymentsRabbitMqProducerService,
  ) {}

  // Сохраняет событие в outbox для последующей отправки.
  save(event: PaymentResultEvent | PaymentNotificationEvent): Promise<void> {
    return this.outboxRepository.save(event);
  }

  // Запускает обработку каждую секунду без перекрытия запусков в этом экземпляре.
  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  async processPending(): Promise<void> {
    const events = await this.outboxRepository.findPending();
    const notifications: PendingOutboxEvent[] = [];

    // Результаты для main запускаются сразу, уведомления собираются в очередь.
    const publications = events.map(async (rawEvent) => {
      const event = JSON.parse(rawEvent.data!) as
        PaymentResultEvent | PaymentNotificationEvent;
      if (event.consumer === 'NOTIFICATIONS') {
        notifications.push({ record: rawEvent, event });
      } else {
        await this.processEvent({ record: rawEvent, event });
      }
    });

    await Promise.allSettled([
      ...publications,
      this.processNotifications(notifications),
    ]);
  }

  private async processNotifications(
    notifications: PendingOutboxEvent[],
  ): Promise<void> {
    const errors: unknown[] = [];
    for (const notification of notifications) {
      try {
        await this.processEvent(notification);
      } catch (error) {
        // Продолжает очередь, а ошибку пробрасывает после её завершения.
        errors.push(error);
      }
    }
    if (errors.length) throw errors[0];
  }

  // Обрабатывает одно событие: учитывает попытку, публикует и сохраняет результат.
  private async processEvent({
    record,
    event,
  }: PendingOutboxEvent): Promise<void> {
    // Фиксирует начало новой попытки до отправки события.
    const attempts = (record.attempts ?? 0) + 1;
    await this.outboxRepository.markProcessing(record.eventId, attempts);
    try {
      await this.publishEvent(event);
      // Успешная публикация завершает событие в outbox.
      await this.outboxRepository.markCompleted(record.eventId);
    } catch (error) {
      // Репозиторий назначит повтор через 10 секунд или ERROR после третьей попытки.
      await this.outboxRepository.markFailed(record.eventId, attempts, error);
    }
  }

  // Публикует событие в очередь его получателя.
  private publishEvent(
    event: PaymentResultEvent | PaymentNotificationEvent,
  ): Promise<void> {
    if (event.consumer === 'NOTIFICATIONS') {
      return this.paymentsRabbitMqProducerService.publishNotificationEvent(
        event,
      );
    }
    return this.paymentsRabbitMqProducerService.publishPaymentResult(event);
  }
}
