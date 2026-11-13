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
            await this.scheduledNotificationsRepository.findById(id);
          if (!notification) return;
          await this.notificationDeliveryService.deliver(notification);
        } catch (error) {
          this.logger.error(error);
        } finally {
          await this.scheduledNotificationsRepository.removeFromQueue(id);
        }
      }),
    );
  }
}
