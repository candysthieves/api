import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';
import { SubscriptionHistoryViewType } from '../../api/view-types/subscription-history-view.type.js';
import { PaymentsTcpService } from '../payments-tcp.service.js';

export class GetSubscriptionHistoryQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number,
    public readonly pageSize: number,
  ) {}
}

@QueryHandler(GetSubscriptionHistoryQuery)
export class GetSubscriptionHistoryQueryHandler implements IQueryHandler<
  GetSubscriptionHistoryQuery,
  SubscriptionHistoryViewType
> {
  constructor(private readonly paymentsTcpService: PaymentsTcpService) {}

  async execute({
    userId,
    page,
    pageSize,
  }: GetSubscriptionHistoryQuery): Promise<SubscriptionHistoryViewType> {
    try {
      const response = await this.paymentsTcpService.getSubscriptionHistory({
        userId,
        page,
        pageSize,
      });
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
