import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { GetTariffsQuery } from '../application/query-handler/get-tariffs.query-handler.js';
import { TariffViewType } from './view-types/tariff-view.type.js';
import { ApiGetTariffs } from '../../../core/swagger/payments-dto/get-tariffs.swagger.js';

@ApiTags('Tariffs')
@Controller('tariffs')
export class TariffsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiGetTariffs()
  getTariffs(): Promise<TariffViewType[]> {
    return this.queryBus.execute<GetTariffsQuery, TariffViewType[]>(
      new GetTariffsQuery(),
    );
  }
}
