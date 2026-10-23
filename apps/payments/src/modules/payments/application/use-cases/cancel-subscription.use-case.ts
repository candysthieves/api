import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { SubscriptionsQueryRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.query.repository.js';

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
    private readonly subscriptionsQueryRepository: SubscriptionsQueryRepository,
  ) {}

  async execute({ userId }: CancelSubscriptionCommand): Promise<boolean> {
    const requestedAt = new Date();
    // Находим активную подписку пользователя, которую нужно отменить.
    const subscription =
      await this.subscriptionsQueryRepository.findActiveSubscription(
        userId,
        requestedAt,
      );

    if (!subscription) return false;

    // Запрашиваем отмену найденной подписки по её ID.
    await this.subscriptionsRepository.requestCancellation(
      subscription.id,
      requestedAt,
    );

    return true;
  }
}
