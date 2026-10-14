import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { TariffsMapper } from '../../api/mappers/tariffs.mapper.js';
import { TariffViewType } from '../../api/view-types/tariff-view.type.js';

export class GetTariffQuery {
  constructor() {}
}

@QueryHandler(GetTariffQuery)
export class GetTariffsQueryHandler implements IQueryHandler<
  GetTariffQuery,
  TariffViewType[]
> {
  constructor(private readonly tariffsRepository: TariffsRepository) {}

  async execute(): Promise<TariffViewType[]> {
    const tariffs = await this.tariffsRepository.getTariffs();
    return TariffsMapper.toViews(tariffs);
  }
}
