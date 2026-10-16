import {
  Controller,
  Delete,
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

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly commandBus: CommandBus) {}

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
