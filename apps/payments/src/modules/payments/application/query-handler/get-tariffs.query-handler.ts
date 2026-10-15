import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TariffsQueryRepository } from '../../infrastructure/repositories/tariffs/tariffs.query.repository.js';
import { TariffsMapper } from '../../api/mappers/tariffs.mapper.js';
import { TariffViewType } from '../../api/view-types/tariff-view.type.js';
import type { SubscriptionTypeName } from '../../../../database/types/payment-database.type.js';

export class GetTariffQuery {
  constructor(public readonly subscriptionType: SubscriptionTypeName) {}
}

@QueryHandler(GetTariffQuery)
export class GetTariffsQueryHandler implements IQueryHandler<
  GetTariffQuery,
  TariffViewType[]
> {
  constructor(private readonly tariffsRepository: TariffsQueryRepository) {}

  async execute({ subscriptionType }: GetTariffQuery): Promise<TariffViewType[]> {
    const tariffs = await this.tariffsRepository.getTariffs(subscriptionType);
    return TariffsMapper.toViews(tariffs);
  }
}
