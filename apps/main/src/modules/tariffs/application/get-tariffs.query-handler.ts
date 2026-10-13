import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TariffViewType } from '../api/tariff-view.type.js';
import { TariffsMapper } from '../api/tariffs.mapper.js';
import { PaymentsTcpService } from './payments-tcp.service.js';

export class GetTariffsQuery {}

@QueryHandler(GetTariffsQuery)
export class GetTariffsQueryHandler implements IQueryHandler<GetTariffsQuery> {
  constructor(private readonly paymentsTcpService: PaymentsTcpService) {}

  async execute(): Promise<TariffViewType[]> {
    const tariffs = await this.paymentsTcpService.getTariffs();
    return TariffsMapper.toViews(tariffs);
  }
}
