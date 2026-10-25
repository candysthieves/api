import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';
import { CurrentSubscriptionViewType } from '../../api/view-types/current-subscription-view.type.js';
import { PaymentsTcpService } from '../payments-tcp.service.js';

export class GetCurrentSubscriptionQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetCurrentSubscriptionQuery)
export class GetCurrentSubscriptionQueryHandler implements IQueryHandler<
  GetCurrentSubscriptionQuery,
  CurrentSubscriptionViewType
> {
  constructor(private readonly paymentsTcpService: PaymentsTcpService) {}

  async execute({
    userId,
  }: GetCurrentSubscriptionQuery): Promise<CurrentSubscriptionViewType> {
    const response =
      await this.paymentsTcpService.getCurrentSubscription(userId);

    if (response.error) {
      DomainExceptions.serviceUnavailable(
        ErrorStatus.SUBSCRIPTION_RETRIEVAL_FAILED,
        'subscription',
        response.error.errors?.[0]?.message ??
          'Failed to get current subscription',
      );
    }

    return {
      expirationDate: response.data?.expirationDate ?? null,
      nextChangeDate: response.data?.nextChangeDate ?? null,
    };
  }
}
