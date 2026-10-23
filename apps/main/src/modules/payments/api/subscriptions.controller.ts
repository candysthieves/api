import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../user-accounts/api/guards/access-token.guard.js';
import { User } from '../../user-accounts/api/decorators/user.decorator.js';
import type { JwtAccessPayload } from '../../../core/types/jwt-payload.type.js';
import { CancelSubscriptionCommand } from '../application/use-cases/cancel-subscription.usecase.js';
import { ApiCancelCurrentSubscription } from '../../../core/swagger/payments-dto/cancel-subscription.swagger.js';
import { GetCurrentSubscriptionQuery } from '../application/query-handler/get-current-subscription.query-handler.js';
import { CurrentSubscriptionViewType } from './view-types/current-subscription-view.type.js';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiGetSubscriptionHistory } from '../../../core/swagger/payments-dto/get-subscription-history.swagger.js';
import { SubscriptionHistoryItemViewType } from './view-types/subscription-history-item-view.type.js';
import { GetSubscriptionHistoryQuery } from '../application/query-handler/get-subscription-history.query-handler.js';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('current')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Get current subscription dates' })
  @ApiOkResponse({ type: CurrentSubscriptionViewType })
  getCurrentSubscription(
    @User() user: JwtAccessPayload,
  ): Promise<CurrentSubscriptionViewType> {
    return this.queryBus.execute(
      new GetCurrentSubscriptionQuery(user.userId.toString()),
    );
  }

  @Get('history')
  @UseGuards(AccessTokenGuard)
  @ApiGetSubscriptionHistory()
  getSubscriptionHistory(
    @User() user: JwtAccessPayload,
  ): Promise<SubscriptionHistoryItemViewType[]> {
    return this.queryBus.execute(
      new GetSubscriptionHistoryQuery(user.userId.toString()),
    );
  }

  @Delete('current')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  @ApiCancelCurrentSubscription()
  async cancelCurrentSubscription(
    @User() user: JwtAccessPayload,
  ): Promise<void> {
    await this.commandBus.execute<CancelSubscriptionCommand, void>(
      new CancelSubscriptionCommand(user.userId.toString()),
    );
  }
}
