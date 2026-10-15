import { Controller, ParseEnumPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { QueryBus } from '@nestjs/cqrs';
import { GetTariffQuery } from '../application/query-handler/get-tariffs.query-handler.js';
import { TariffViewType } from './view-types/tariff-view.type.js';
import { ObjectResult } from '../../../core/object-result.js';
import { SUBSCRIPTION_TYPES } from '@libs/contracts';
import type { SubscriptionTypeName } from '@libs/contracts';
import { GetSubscriptionTypesQuery } from '../application/query-handler/get-subscription-types.query-handler.js';

@Controller('tariffs')
export class TariffsController {
  constructor(private readonly queryBus: QueryBus) {}

  @MessagePattern({ cmd: 'get-tariffs' })
  async getTariffs(
    @Payload('type', new ParseEnumPipe(SUBSCRIPTION_TYPES))
    subscriptionType: SubscriptionTypeName,
  ): Promise<ObjectResult<TariffViewType[]>> {
    const tariffs = await this.queryBus.execute<
      GetTariffQuery,
      TariffViewType[]
    >(new GetTariffQuery(subscriptionType));

    return ObjectResult.success(tariffs);
  }

  @MessagePattern({ cmd: 'get-subscription-types' })
  async getSubscriptionTypes(): Promise<
    ObjectResult<{ type: SubscriptionTypeName }[]>
  > {
    const types = await this.queryBus.execute<
      GetSubscriptionTypesQuery,
      { type: SubscriptionTypeName }[]
    >(new GetSubscriptionTypesQuery());

    return ObjectResult.success(types);
  }
}

