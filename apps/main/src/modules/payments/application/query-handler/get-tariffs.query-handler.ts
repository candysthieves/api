import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaymentsTcpService } from '../payments-tcp.service.js';
import { TariffsMapper } from '../../api/mappers/tariffs.mapper.js';
import { TariffViewType } from '../../api/view-types/tariff-view.type.js';

export class GetTariffsQuery {}

@QueryHandler(GetTariffsQuery)
export class GetTariffsQueryHandler implements IQueryHandler<
  GetTariffsQuery,
  TariffViewType[]
> {
  constructor(private readonly paymentsTcpService: PaymentsTcpService) {}

  async execute(): Promise<TariffViewType[]> {
    const tariffs = await this.paymentsTcpService.getTariffs();
    return TariffsMapper.toViews(tariffs);
  }
}
