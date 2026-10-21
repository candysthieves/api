import {
  Controller,
  Delete,
  Get,
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
import { ApiGetSubscriptionHistory } from '../../../core/swagger/payments-dto/get-subscription-history.swagger.js';
import { SubscriptionHistoryItemViewType } from './view-types/subscription-history-item-view.type.js';

const subscriptionHistoryExample: SubscriptionHistoryItemViewType[] = [
  {
    id: 'payment-123',
    date: '2026-09-15T12:00:00.000Z',
    paymentDate: '2026-09-15T12:00:00.000Z',
    subscriptionEndDate: '2026-10-15T12:00:00.000Z',
    price: 999,
    subscriptionName: 'Monthly',
    subscriptionType: 'Personal',
    paymentService: 'YOOKASSA',
  },
  {
    id: 'payment-122',
    date: '2026-08-15T12:00:00.000Z',
    paymentDate: '2026-08-15T12:00:00.000Z',
    subscriptionEndDate: '2026-09-15T12:00:00.000Z',
    price: 999,
    subscriptionName: 'Monthly',
    subscriptionType: 'Personal',
    paymentService: 'YOOKASSA',
  },
];

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

  @Get('history')
  @UseGuards(AccessTokenGuard)
  @ApiGetSubscriptionHistory()
  getSubscriptionHistory(): SubscriptionHistoryItemViewType[] {
    return subscriptionHistoryExample;
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
