import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { QueryBus } from '@nestjs/cqrs';
import { GetTariffQuery } from '../application/query-handler/get-tariffs.query-handler.js';
import { TariffViewType } from './view-types/tariff-view.type.js';

@Controller('tariffs')
export class TariffsController {
  constructor(private readonly queryBus: QueryBus) {}

  @MessagePattern({ cmd: 'get-tariffs' })
  getTariffs(): Promise<TariffViewType[]> {
    return this.queryBus.execute<GetTariffQuery, TariffViewType[]>(
      new GetTariffQuery(),
    );
  }
}
