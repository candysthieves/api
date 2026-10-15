import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaymentsTcpService } from '../payments-tcp.service.js';
import { SubscriptionTypeViewType } from '../../api/view-types/subscription-type-view.type.js';

export class GetSubscriptionTypesQuery {}

@QueryHandler(GetSubscriptionTypesQuery)
export class GetSubscriptionTypesQueryHandler implements IQueryHandler<
  GetSubscriptionTypesQuery,
  SubscriptionTypeViewType[]
> {
  constructor(private readonly paymentsTcpService: PaymentsTcpService) {}

  execute(): Promise<SubscriptionTypeViewType[]> {
    return this.paymentsTcpService.getSubscriptionTypes();
  }
}
