import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetTariffsQuery } from '../application/query-handler/get-tariffs.query-handler.js';
import { TariffViewType } from './view-types/tariff-view.type.js';

@ApiTags('Tariffs')
@Controller('tariffs')
export class TariffsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOkResponse({ type: TariffViewType, isArray: true })
  getTariffs(): Promise<TariffViewType[]> {
    return this.queryBus.execute<GetTariffsQuery, TariffViewType[]>(
      new GetTariffsQuery(),
    );
  }
}
