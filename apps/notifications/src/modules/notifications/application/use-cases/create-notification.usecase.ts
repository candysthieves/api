import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateNotificationContract } from '@libs/contracts';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository.js';
import { NotificationFactory } from '../factories/notification.factory.js';

export class CreateNotificationCommand {
  constructor(public readonly dto: CreateNotificationContract) {}
}

@CommandHandler(CreateNotificationCommand)
export class CreateNotificationUseCase implements ICommandHandler<
  CreateNotificationCommand,
  void
> {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async execute({ dto }: CreateNotificationCommand): Promise<void> {
    const notification = NotificationFactory.create(dto);

    await this.notificationsRepository.create(notification);
  }
}
