import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetTariffsQuery } from '../application/query-handler/get-tariffs.query-handler.js';
import { TariffViewType } from './view-types/tariff-view.type.js';
import { ApiGetTariffs } from '../../../core/swagger/payments-dto/get-tariffs.swagger.js';
import { SUBSCRIPTION_TYPES } from '@libs/contracts';
import type { SubscriptionTypeName } from '@libs/contracts';

@ApiTags('Tariffs')
@Controller('tariffs')
export class TariffsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiQuery({
    name: 'type',
    enum: Object.values(SUBSCRIPTION_TYPES),
    required: true,
  })
  @ApiGetTariffs()
  getTariffs(
    @Query('type', new ParseEnumPipe(SUBSCRIPTION_TYPES))
    subscriptionType: SubscriptionTypeName,
  ): Promise<TariffViewType[]> {
    return this.queryBus.execute<GetTariffsQuery, TariffViewType[]>(
      new GetTariffsQuery(subscriptionType),
    );
  }
}
