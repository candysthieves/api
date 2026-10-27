import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';
import { SubscriptionHistoryItemViewType } from '../../api/view-types/subscription-history-item-view.type.js';
import { PaymentsTcpService } from '../payments-tcp.service.js';

export class GetSubscriptionHistoryQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetSubscriptionHistoryQuery)
export class GetSubscriptionHistoryQueryHandler implements IQueryHandler<
  GetSubscriptionHistoryQuery,
  SubscriptionHistoryItemViewType[]
> {
  constructor(private readonly paymentsTcpService: PaymentsTcpService) {}

  async execute({
    userId,
  }: GetSubscriptionHistoryQuery): Promise<SubscriptionHistoryItemViewType[]> {
    try {
      const response =
        await this.paymentsTcpService.getSubscriptionHistory(userId);
      if (!response.error && response.data) return response.data;
    } catch {
      // Report transport and remote failures using the HTTP domain error format.
    }

    DomainExceptions.serviceUnavailable(
      ErrorStatus.SUBSCRIPTION_RETRIEVAL_FAILED,
      'subscription',
      'Failed to get subscription payment history',
    );
  }
}
