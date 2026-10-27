import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RenewSubscriptionsCommand } from './use-cases/renew-subscriptions.usecase.js';
import { SubscriptionsRepository } from '../infrastructure/repositories/subscriptions/subscriptions.repository.js';

@Injectable()
export class SubscriptionsScheduler {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  renew(): Promise<void> {
    return this.commandBus.execute(new RenewSubscriptionsCommand());
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  failExpiredProcessing(): Promise<void> {
    return this.subscriptionsRepository.failExpiredProcessing();
  }
}
