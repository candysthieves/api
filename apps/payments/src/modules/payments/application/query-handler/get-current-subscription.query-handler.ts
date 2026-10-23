import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SubscriptionsQueryRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.query.repository.js';

export class GetCurrentSubscriptionQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetCurrentSubscriptionQuery)
export class GetCurrentSubscriptionQueryHandler implements IQueryHandler<GetCurrentSubscriptionQuery> {
  constructor(private readonly subscriptions: SubscriptionsQueryRepository) {}
  async execute({ userId }: GetCurrentSubscriptionQuery) {
    const subscription = await this.subscriptions.findCurrentSubscription(
      userId,
      new Date(),
    );
    return (
      subscription ?? {
        expirationDate: null,
        nextChargeDate: null,
      }
    );
  }
}
