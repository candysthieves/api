import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetSubscriptionTypesQuery } from '../application/query-handler/get-subscription-types.query-handler.js';
import { SubscriptionTypeViewType } from './view-types/subscription-type-view.type.js';

@ApiTags('Subscription types')
@Controller('subscription-types')
export class SubscriptionTypesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Get available subscription types' })
  @ApiOkResponse({ type: SubscriptionTypeViewType, isArray: true })
  getSubscriptionTypes(): Promise<SubscriptionTypeViewType[]> {
    return this.queryBus.execute<
      GetSubscriptionTypesQuery,
      SubscriptionTypeViewType[]
    >(new GetSubscriptionTypesQuery());
  }
}
