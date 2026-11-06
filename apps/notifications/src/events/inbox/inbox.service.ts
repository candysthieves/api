import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import type { PaymentNotificationEvent } from '@libs/contracts';
import { InboxRepository } from './inbox.repository.js';
import { CreateNotificationCommand } from '../../modules/notifications/application/use-cases/create-notification.usecase.js';

@Injectable()
export class InboxService {
  constructor(
    private readonly inboxRepository: InboxRepository,
    private readonly commandBus: CommandBus,
  ) {}

  accept(event: PaymentNotificationEvent): Promise<void> {
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
          const event = JSON.parse(record.data!) as PaymentNotificationEvent;
          await this.handleEvent(event);
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
  }

  private async handleEvent(event: PaymentNotificationEvent): Promise<void> {
    if (event.type === 'payment.canceled') {
      await this.commandBus.execute(
        new CreateNotificationCommand({
          userId: event.data.userId,
          title: 'Payment failed',
          message:
            'Your payment was canceled or unsuccessful. Please try again.',
          type: 'PAYMENT',
        }),
      );
      return;
    }

    if (event.type === 'payment.completed') {
      // 1. Уведомление об успешной оплате (сразу / через 30 сек)
      await this.commandBus.execute(
        new CreateNotificationCommand({
          userId: event.data.userId,
          title: 'Payment successful',
          message: 'Your subscription has been successfully activated.',
          type: 'PAYMENT',
        }),
      );
    }
  }

  @Cron('*/10 * * * * *', { waitForCompletion: true })
  recover(): Promise<void> {
    return this.inboxRepository.recover();
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  cleanup(): Promise<void> {
    return this.inboxRepository.cleanup();
  }
}
