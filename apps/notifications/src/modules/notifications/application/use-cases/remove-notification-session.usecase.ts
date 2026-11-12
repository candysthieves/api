import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { NotificationSessionContract } from '@libs/contracts';
import { NotificationSocketsRepository } from '../../infrastructure/repositories/notification-sockets.repository.js';

export class RemoveNotificationSessionCommand {
  constructor(public readonly dto: NotificationSessionContract) {}
}

@CommandHandler(RemoveNotificationSessionCommand)
export class RemoveNotificationSessionUseCase implements ICommandHandler<
  RemoveNotificationSessionCommand,
  void
> {
  constructor(
    private readonly notificationSocketsRepository: NotificationSocketsRepository,
  ) {}

  async execute({ dto }: RemoveNotificationSessionCommand): Promise<void> {
    await this.notificationSocketsRepository.remove(dto.userId, dto.socketId);
  }
}
