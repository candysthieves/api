import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaymentsTcpService } from '../payments-tcp.service.js';
import { TariffsMapper } from '../../api/mappers/tariffs.mapper.js';
import { TariffViewType } from '../../api/view-types/tariff-view.type.js';
import type { SubscriptionTypeName } from '@libs/contracts';

export class GetTariffsQuery {
  constructor(public readonly subscriptionType: SubscriptionTypeName) {}
}

@QueryHandler(GetTariffsQuery)
export class GetTariffsQueryHandler implements IQueryHandler<
  GetTariffsQuery,
  TariffViewType[]
> {
  constructor(private readonly paymentsTcpService: PaymentsTcpService) {}

  async execute({ subscriptionType }: GetTariffsQuery): Promise<TariffViewType[]> {
    const tariffs = await this.paymentsTcpService.getTariffs(subscriptionType);
    return TariffsMapper.toViews(tariffs);
  }
}
