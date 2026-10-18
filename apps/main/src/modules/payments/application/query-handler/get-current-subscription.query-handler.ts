import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';
import { PaymentsTcpService } from '../payments-tcp.service.js';
import { SubscriptionsMapper } from '../../api/mappers/subscriptions.mapper.js';
import { CurrentSubscriptionViewType } from '../../api/view-types/current-subscription-view.type.js';

export class GetCurrentSubscriptionQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetCurrentSubscriptionQuery)
export class GetCurrentSubscriptionQueryHandler implements IQueryHandler<
  GetCurrentSubscriptionQuery,
  CurrentSubscriptionViewType
> {
  constructor(private readonly payments: PaymentsTcpService) {}
  async execute({
    userId,
  }: GetCurrentSubscriptionQuery): Promise<CurrentSubscriptionViewType> {
    const response = await this.payments.getCurrentSubscription(userId);
    if (!response.error && response.data)
      return SubscriptionsMapper.toCurrentView(response.data);
    if (response.error?.code === 'SUBSCRIPTION_NOT_FOUND') {
      DomainExceptions.notFound(
        ErrorStatus.SUBSCRIPTION_NOT_FOUND,
        'subscription',
        'No current subscription was found',
      );
    }
    DomainExceptions.serviceUnavailable(
      ErrorStatus.SUBSCRIPTION_QUERY_FAILED,
      'subscription',
      'Failed to retrieve current subscription',
    );
  }
}
