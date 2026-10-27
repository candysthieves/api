import { Controller } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CancelSubscriptionCommand } from '../application/use-cases/cancel-subscription.use-case.js';
import { ObjectResult } from '../../../core/object-result.js';
import { SubscriptionErrorCode } from '@libs/contracts';
import { GetCurrentSubscriptionQuery } from '../application/query-handler/get-current-subscription.query-handler.js';
import { GetSubscriptionHistoryQuery } from '../application/query-handler/get-subscription-history.query-handler.js';
import type {
  GetSubscriptionHistoryContract,
  SubscriptionHistoryContract,
} from '@libs/contracts';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @MessagePattern({ cmd: 'get-current-subscription' })
  getCurrentSubscription(@Payload() payload: { userId: string }): Promise<
    ObjectResult<{
      expirationDate: string | null;
      nextChangeDate: string | null;
    }>
  > {
    return this.queryBus
      .execute<
        GetCurrentSubscriptionQuery,
        { expirationDate: string | null; nextChangeDate: string | null }
      >(new GetCurrentSubscriptionQuery(payload.userId))
      .then((subscription) => ObjectResult.success(subscription));
  }

  @MessagePattern({ cmd: 'get-subscription-history' })
  async getSubscriptionHistory(
    @Payload() payload: GetSubscriptionHistoryContract,
  ): Promise<ObjectResult<SubscriptionHistoryContract>> {
    const history = await this.queryBus.execute<
      GetSubscriptionHistoryQuery,
      SubscriptionHistoryContract
    >(
      new GetSubscriptionHistoryQuery(
        payload.userId,
        payload.page,
        payload.pageSize,
      ),
    );
    return ObjectResult.success(history);
  }

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
