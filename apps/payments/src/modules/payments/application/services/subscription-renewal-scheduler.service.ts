import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ProcessDueSubscriptionsUseCase,
  ProcessDueSubscriptionsCommand,
} from '../use-cases/process-due-subscriptions.usecase.js';

@Injectable()
export class SubscriptionRenewalSchedulerService {
  private running = false;

  constructor(private readonly processDue: ProcessDueSubscriptionsUseCase) {}

  /** Запускает обработку подписок с наступившей датой списания. */
  @Cron(CronExpression.EVERY_SECOND)
  async process(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.processDue.execute(
        new ProcessDueSubscriptionsCommand(new Date()),
      );
    } finally {
      this.running = false;
    }
  }
}
