import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { NotificationSessionContract } from '@libs/contracts';
import { NotificationSocketsRepository } from '../../infrastructure/repositories/notification-sockets.repository.js';

export class SaveNotificationSessionCommand {
  constructor(public readonly dto: NotificationSessionContract) {}
}

@CommandHandler(SaveNotificationSessionCommand)
export class SaveNotificationSessionUseCase implements ICommandHandler<
  SaveNotificationSessionCommand,
  void
> {
  constructor(
    private readonly notificationSocketsRepository: NotificationSocketsRepository,
  ) {}

  async execute({ dto }: SaveNotificationSessionCommand): Promise<void> {
    await this.notificationSocketsRepository.save(dto.userId, dto.socketId);
  }
}
