import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentEventsRepository } from '../../infrastructure/repositories/payment-events.repository.js';
import { PaymentEventsTransport } from '../../infrastructure/payment-events-transport.service.js';
import { ProcessYookassaNotificationCommand } from '../use-cases/process-yookassa-notification.usecase.js';

@Injectable()
export class PaymentEventsSchedulerService {
  constructor(
    private readonly paymentEventsRepository: PaymentEventsRepository,
    private readonly paymentEventsTransport: PaymentEventsTransport,
    private readonly commandBus: CommandBus,
  ) {}

  // Обрабатывает уведомления YooKassa и публикует статусы платежей.
  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  async process(): Promise<void> {
    await Promise.all([
      this.paymentEventsRepository.processPendingNotifications(
        (providerPaymentId) =>
          this.commandBus.execute(
            new ProcessYookassaNotificationCommand(providerPaymentId),
          ),
      ),
      this.paymentEventsRepository.publishPending((paymentStatusEvent) =>
        this.paymentEventsTransport.publish(paymentStatusEvent),
      ),
    ]);
  }

  // Восстанавливает зависшие события или завершает исчерпавшие попытки.
  @Cron(CronExpression.EVERY_10_SECONDS, { waitForCompletion: true })
  recover(): Promise<void> {
    return this.paymentEventsRepository.recover();
  }

  // Очищает данные завершённых событий старше часа.
  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  cleanup(): Promise<void> {
    return this.paymentEventsRepository.cleanup();
  }
}
