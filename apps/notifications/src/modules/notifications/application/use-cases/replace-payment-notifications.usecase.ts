import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ScheduledNotificationModel } from '../../../../database/models/scheduled-notification.model.js';
import { ScheduledNotificationsRepository } from '../../infrastructure/repositories/scheduled-notifications.repository.js';

export class ReplacePaymentNotificationsCommand {
  constructor(public readonly notification: ScheduledNotificationModel) {}
}

@CommandHandler(ReplacePaymentNotificationsCommand)
export class ReplacePaymentNotificationsUseCase implements ICommandHandler<
  ReplacePaymentNotificationsCommand,
  void
> {
  constructor(
    private readonly scheduledNotificationsRepository: ScheduledNotificationsRepository,
  ) {}

  async execute({
    notification,
  }: ReplacePaymentNotificationsCommand): Promise<void> {
    const futureNotifications =
      await this.scheduledNotificationsRepository.findFutureByUserId(
        notification.userId,
        Date.now(),
      );
    for (const existing of futureNotifications) {
      if (existing.paymentId === notification.paymentId) continue;
      await this.scheduledNotificationsRepository.deleteNotification(
        existing.key,
        notification.userId,
      );
    }
    await this.scheduledNotificationsRepository.save(notification);
  }
}
