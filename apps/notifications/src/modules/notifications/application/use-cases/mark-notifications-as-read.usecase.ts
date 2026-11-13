import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository.js';
import type { MarkNotificationsAsReadContract } from '@libs/contracts';
import { NotificationFactory } from '../factories/notification.factory.js';

export class MarkNotificationsAsReadCommand {
  constructor(public readonly dto: MarkNotificationsAsReadContract) {}
}

@CommandHandler(MarkNotificationsAsReadCommand)
export class MarkNotificationsAsReadUseCase implements ICommandHandler<
  MarkNotificationsAsReadCommand,
  void
> {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async execute({ dto }: MarkNotificationsAsReadCommand): Promise<void> {
    const ids: string[] = dto.ids;
    const userId: string = dto.userId;

    const records = await this.notificationsRepository.findByIds(userId, ids);

    for (const { key, notification } of records) {
      if (notification.userId !== userId || notification.isRead) continue;
      await this.notificationsRepository.save(
        key,
        NotificationFactory.markAsRead(notification),
      );
    }
  }
}
