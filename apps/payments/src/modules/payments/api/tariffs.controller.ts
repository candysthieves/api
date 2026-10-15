import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { QueryBus } from '@nestjs/cqrs';
import { GetTariffQuery } from '../application/query-handler/get-tariffs.query-handler.js';
import { TariffViewType } from './view-types/tariff-view.type.js';
import { ObjectResult } from '../../../core/object-result.js';

@Controller('tariffs')
export class TariffsController {
  constructor(private readonly queryBus: QueryBus) {}

  @MessagePattern({ cmd: 'get-tariffs' })
  async getTariffs(): Promise<ObjectResult<TariffViewType[]>> {
    const tariffs = await this.queryBus.execute<
      GetTariffQuery,
      TariffViewType[]
    >(new GetTariffQuery());

    return ObjectResult.success(tariffs);
  }
}

