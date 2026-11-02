import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';

export type CurrentSubscription = {
  expirationDate: string | null;
  nextChangeDate: string | null;
};

export class GetCurrentSubscriptionQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetCurrentSubscriptionQuery)
export class GetCurrentSubscriptionQueryHandler implements IQueryHandler<
  GetCurrentSubscriptionQuery,
  CurrentSubscription
> {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  async execute({
    userId,
  }: GetCurrentSubscriptionQuery): Promise<CurrentSubscription> {
    const subscription =
      await this.subscriptionsRepository.findCurrentSubscription(
        userId,
        new Date(),
      );

    if (!subscription) {
      return { expirationDate: null, nextChangeDate: null };
    }

    return {
      expirationDate:
        subscription.expirationDateSeconds === null
          ? null
          : new Date(subscription.expirationDateSeconds * 1000).toISOString(),
      nextChangeDate:
        subscription.nextChargeDateSeconds === null
          ? null
          : new Date(subscription.nextChargeDateSeconds * 1000).toISOString(),
    };
  }
}
