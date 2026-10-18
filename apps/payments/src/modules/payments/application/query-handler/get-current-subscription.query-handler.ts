import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RpcException } from '@nestjs/microservices';
import { ObjectResult } from '../../../../core/object-result.js';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';

export class GetCurrentSubscriptionQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetCurrentSubscriptionQuery)
export class GetCurrentSubscriptionQueryHandler implements IQueryHandler<GetCurrentSubscriptionQuery> {
  constructor(private readonly subscriptions: SubscriptionsRepository) {}
  async execute({ userId }: GetCurrentSubscriptionQuery) {
    const subscription = await this.subscriptions.findCurrentSubscription(
      userId,
      new Date(),
    );
    if (!subscription) {
      throw new RpcException(
        ObjectResult.failure({
          code: 'SUBSCRIPTION_NOT_FOUND',
          errors: [
            {
              field: 'subscription',
              message: 'No current subscription was found',
            },
          ],
        }),
      );
    }
    return subscription;
  }
}
