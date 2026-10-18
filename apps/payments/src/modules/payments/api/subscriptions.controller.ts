import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CancelSubscriptionCommand } from '../application/use-cases/cancel-subscription.use-case.js';
import { ObjectResult } from '../../../core/object-result.js';
import { SubscriptionErrorCode } from '@libs/contracts';
import { QueryBus } from '@nestjs/cqrs';
import { GetCurrentSubscriptionQuery } from '../application/query-handler/get-current-subscription.query-handler.js';
import {
  GetPendingSubscriptionNotificationsQuery,
  AcknowledgeSubscriptionNotificationCommand,
} from '../application/use-cases/deliver-subscription-notifications.usecase.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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

  @MessagePattern({ cmd: 'get-current-subscription' })
  async getCurrentSubscription(@Payload() payload: { userId: string }) {
    return ObjectResult.success(
      await this.queryBus.execute(
        new GetCurrentSubscriptionQuery(payload.userId),
      ),
    );
  }

  @MessagePattern({ cmd: 'get-pending-subscription-notifications' })
  async getPendingNotifications(@Payload() payload: { limit: number }) {
    return ObjectResult.success(
      await this.queryBus.execute(
        new GetPendingSubscriptionNotificationsQuery(payload.limit),
      ),
    );
  }

  @MessagePattern({ cmd: 'acknowledge-subscription-notification' })
  async acknowledgeNotification(
    @Payload() payload: { notificationId: string },
  ) {
    await this.commandBus.execute(
      new AcknowledgeSubscriptionNotificationCommand(payload.notificationId),
    );
    return ObjectResult.success(true);
  }
}
