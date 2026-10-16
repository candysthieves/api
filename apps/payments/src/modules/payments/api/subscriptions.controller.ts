import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CancelSubscriptionCommand } from '../application/use-cases/cancel-subscription.use-case.js';
import { ObjectResult } from '../../../core/object-result.js';
import { SubscriptionErrorCode } from '@libs/contracts';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly commandBus: CommandBus) {}

  @MessagePattern({ cmd: 'cancel-subscription' })
  async cancelSubscription(
    @Payload() payload: { userId: string },
  ): Promise<ObjectResult<boolean | null>> {
    const cancelled = await this.commandBus.execute<
      CancelSubscriptionCommand,
      boolean
    >(new CancelSubscriptionCommand(payload.userId));

    if (!cancelled) {
      return ObjectResult.failure({
        code: SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
        errors: [
          {
            field: 'subscription',
            message: 'No active subscription was found',
          },
        ],
      });
    }

    return ObjectResult.success(true);
  }
}
