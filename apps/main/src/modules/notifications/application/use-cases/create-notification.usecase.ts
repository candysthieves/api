import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateNotificationContract } from '@libs/contracts';
import { NotificationsTcpService } from '../notifications-tcp.service.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

export class CreateNotificationCommand {
  constructor(public readonly dto: CreateNotificationContract) {}
}

@CommandHandler(CreateNotificationCommand)
export class CreateNotificationUseCase
  implements ICommandHandler<CreateNotificationCommand, void>
{
  constructor(
    private readonly notificationsTcpService: NotificationsTcpService,
  ) {}

  async execute({ dto }: CreateNotificationCommand): Promise<void> {
    try {
      await this.notificationsTcpService.createNotification(dto);
    } catch {
      DomainExceptions.serviceUnavailable(
        ErrorStatus.NOTIFICATIONS_SERVICE_UNAVAILABLE,
        'notifications',
        'Notifications service is temporarily unavailable',
      );
    }
  }
}
