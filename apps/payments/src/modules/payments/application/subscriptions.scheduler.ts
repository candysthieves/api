import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RenewSubscriptionsCommand } from './use-cases/renew-subscriptions.usecase.js';
import { SubscriptionsRepository } from '../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { SubscriptionExpirationService } from './services/subscription-expiration.service.js';

@Injectable()
export class SubscriptionsScheduler {
  private readonly logger = new Logger(SubscriptionsScheduler.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly subscriptionExpirationService: SubscriptionExpirationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  renew(): Promise<void> {
    return this.commandBus.execute(new RenewSubscriptionsCommand());
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  async failExpiredProcessing(): Promise<void> {
    const subscriptions =
      await this.subscriptionsRepository.findExpiredProcessing();
    for (const subscription of subscriptions) {
      try {
        await this.subscriptionExpirationService.fail(subscription);
      } catch (error) {
        this.logger.error(
          `Subscription timeout processing failed: ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
