import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateNotificationContract } from '@libs/contracts';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository.js';

export class CreateNotificationCommand {
  constructor(public readonly dto: CreateNotificationContract) {}
}

@CommandHandler(CreateNotificationCommand)
export class CreateNotificationUseCase implements ICommandHandler<
  CreateNotificationCommand,
  unknown
> {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async execute({ dto }: CreateNotificationCommand): Promise<unknown> {
    // Вся бизнес-логика реализуется здесь
    return dto;
  }
}
