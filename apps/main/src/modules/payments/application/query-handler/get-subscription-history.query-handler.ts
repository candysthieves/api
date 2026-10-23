import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaymentsTcpService } from '../payments-tcp.service.js';
import { SubscriptionHistoryItemViewType } from '../../api/view-types/subscription-history-item-view.type.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';
import { SubscriptionHistoryMapper } from '../../api/mappers/subscription-history.mapper.js';

export class GetSubscriptionHistoryQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetSubscriptionHistoryQuery)
export class GetSubscriptionHistoryQueryHandler implements IQueryHandler<
  GetSubscriptionHistoryQuery,
  SubscriptionHistoryItemViewType[]
> {
  constructor(private readonly paymentService: PaymentsTcpService) {}

  async execute({
    userId,
  }: GetSubscriptionHistoryQuery): Promise<SubscriptionHistoryItemViewType[]> {
    const subscriptionHistory =
      await this.paymentService.getSubscriptionHistory(userId);
    if (subscriptionHistory.error || !subscriptionHistory.data) {
      DomainExceptions.serviceUnavailable(
        ErrorStatus.SUBSCRIPTION_QUERY_FAILED,
        'subscription',
        'Failed to retrieve subscription payment history',
      );
    }

    return SubscriptionHistoryMapper.toViews(subscriptionHistory.data);
  }
}
