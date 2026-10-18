import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
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
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('current')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get current subscription dates' })
  @ApiOkResponse({ type: CurrentSubscriptionViewType })
  getCurrentSubscription(
    @User() user: JwtAccessPayload,
  ): Promise<CurrentSubscriptionViewType> {
    return this.queryBus.execute(
      new GetCurrentSubscriptionQuery(user.userId.toString()),
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
