import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { SubscriptionTypeContract } from '@libs/contracts';
import { SubscriptionTypesQueryRepository } from '../../infrastructure/repositories/subscription-types/subscription-types.query.repository.js';

export class GetSubscriptionTypesQuery {}

@QueryHandler(GetSubscriptionTypesQuery)
export class GetSubscriptionTypesQueryHandler implements IQueryHandler<
  GetSubscriptionTypesQuery,
  SubscriptionTypeContract[]
> {
  constructor(
    private readonly subscriptionTypesRepository: SubscriptionTypesQueryRepository,
  ) {}

  async execute(): Promise<SubscriptionTypeContract[]> {
    const types = await this.subscriptionTypesRepository.getSubscriptionTypes();
    return types.map(({ namePaymentStatus }) => ({ type: namePaymentStatus }));
  }
}
