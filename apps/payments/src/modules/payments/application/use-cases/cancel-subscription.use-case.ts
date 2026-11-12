import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { OutboxService } from '../../../../events/outbox/outbox.service.js';

export class CancelSubscriptionCommand {
  constructor(public readonly userId: string) {}
}

//TODO в будущем добавить логи самого платёжного сервиса
@CommandHandler(CancelSubscriptionCommand)
export class CancelSubscriptionUseCase implements ICommandHandler<
  CancelSubscriptionCommand,
  boolean
> {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly outboxService: OutboxService,
  ) {}

  async execute({ userId }: CancelSubscriptionCommand): Promise<boolean> {
    const requestedAt = new Date();
    // Находим активную подписку пользователя, которую нужно отменить.
    const subscription =
      await this.subscriptionsRepository.findActiveSubscription(
        userId,
        requestedAt,
      );

    if (!subscription) return false;

    // Запрашиваем отмену найденной подписки по её ID.
    await this.subscriptionsRepository.requestCancellation(subscription.id);
    await this.outboxService.save({
      eventId: `${subscription.id}:notifications:cancel`,
      consumer: 'NOTIFICATIONS',
      type: 'subscription.notifications.canceled',
      data: { userId, subscriptionId: subscription.id },
    });

    return true;
  }
}
