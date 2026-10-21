import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../user-accounts/api/guards/access-token.guard.js';
import { User } from '../../user-accounts/api/decorators/user.decorator.js';
import type { JwtAccessPayload } from '../../../core/types/jwt-payload.type.js';
import { CancelSubscriptionCommand } from '../application/use-cases/cancel-subscription.usecase.js';
import { ApiCancelCurrentSubscription } from '../../../core/swagger/payments-dto/cancel-subscription.swagger.js';
import { ApiGetSubscriptionHistory } from '../../../core/swagger/payments-dto/get-subscription-history.swagger.js';
import { SubscriptionHistoryItemViewType } from './view-types/subscription-history-item-view.type.js';

const subscriptionHistoryExample: SubscriptionHistoryItemViewType[] = [
  {
    date: '2026-09-15T12:00:00.000Z',
    price: 999,
    subscriptionName: 'Monthly',
    subscriptionType: 'Personal',
    paymentService: 'YOOKASSA',
  },
  {
    date: '2026-08-15T12:00:00.000Z',
    price: 999,
    subscriptionName: 'Monthly',
    subscriptionType: 'Personal',
    paymentService: 'YOOKASSA',
  },
];

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly commandBus: CommandBus) {}

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
