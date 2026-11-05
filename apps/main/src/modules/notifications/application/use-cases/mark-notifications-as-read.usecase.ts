import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotificationsTcpService } from '../notifications-tcp.service.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

export class MarkNotificationsAsReadCommand {
  constructor(
    public readonly userId: string,
    public readonly ids: string[],
  ) {}
}

@CommandHandler(MarkNotificationsAsReadCommand)
export class MarkNotificationsAsReadUseCase implements ICommandHandler<
  MarkNotificationsAsReadCommand,
  void
> {
  constructor(
    private readonly notificationsTcpService: NotificationsTcpService,
  ) {}

  async execute({
    userId,
    ids,
  }: MarkNotificationsAsReadCommand): Promise<void> {
    try {
      await this.notificationsTcpService.markNotificationsAsRead({
        userId,
        ids,
      });
    } catch {
      DomainExceptions.serviceUnavailable(
        ErrorStatus.NOTIFICATIONS_SERVICE_UNAVAILABLE,
        'notifications',
        'Notifications service is temporarily unavailable',
      );
    }
  }
}
