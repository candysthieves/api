import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { NotificationsCountContract } from '@libs/contracts';
import { NotificationsTcpService } from '../notifications-tcp.service.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

export class GetNotificationsCountQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetNotificationsCountQuery)
export class GetNotificationsCountQueryHandler implements IQueryHandler<
  GetNotificationsCountQuery,
  NotificationsCountContract
> {
  constructor(
    private readonly notificationsTcpService: NotificationsTcpService,
  ) {}

  async execute({
    userId,
  }: GetNotificationsCountQuery): Promise<NotificationsCountContract> {
    try {
      const response =
        await this.notificationsTcpService.getNotificationsCount(userId);
      if (!response.error && response.data) {
        return response.data;
      }
    } catch {
      // Convert dependency failures to the existing public domain error.
    }

    DomainExceptions.serviceUnavailable(
      ErrorStatus.NOTIFICATIONS_SERVICE_UNAVAILABLE,
      'notifications',
      'Notifications service is temporarily unavailable',
    );
  }
}
