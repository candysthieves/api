import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledNotificationsRepository } from '../infrastructure/repositories/scheduled-notifications.repository.js';
import { NotificationDeliveryService } from './notification-delivery.service.js';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly scheduledNotificationsRepository: ScheduledNotificationsRepository,
    private readonly notificationDeliveryService: NotificationDeliveryService,
  ) {}

  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  async execute(): Promise<void> {
    const ids = await this.scheduledNotificationsRepository.findDueIds(
      Date.now(),
    );
    await Promise.all(
      ids.map(async (id) => {
        try {
          const notification =
            await this.scheduledNotificationsRepository.materialize(
              id,
              Date.now(),
            );
          if (!notification) return;
          await this.notificationDeliveryService.deliver(notification);
          await this.scheduledNotificationsRepository.complete(id, Date.now());
        } catch (error) {
          this.logger.error(`Notification execution failed: ${id}`);
          try {
            await this.scheduledNotificationsRepository.fail(
              id,
              Date.now(),
              error,
            );
          } catch {
            this.logger.error(`Notification retry could not be saved: ${id}`);
          }
        }
      }),
    );
  }
}
