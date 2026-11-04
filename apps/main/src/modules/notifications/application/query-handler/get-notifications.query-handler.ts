import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedNotificationsContract } from '@libs/contracts';
import { NotificationsTcpService } from '../notifications-tcp.service.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

export class GetNotificationsQuery {
  constructor(
    public readonly userId: string,
    public readonly pageSize: number,
    public readonly cursor?: string | null,
  ) {}
}

@QueryHandler(GetNotificationsQuery)
export class GetNotificationsQueryHandler implements IQueryHandler<
  GetNotificationsQuery,
  PaginatedNotificationsContract
> {
  constructor(
    private readonly notificationsTcpService: NotificationsTcpService,
  ) {}

  async execute({
    userId,
    pageSize,
    cursor,
  }: GetNotificationsQuery): Promise<PaginatedNotificationsContract> {
    try {
      const response = await this.notificationsTcpService.getNotifications({
        userId,
        pageSize,
        cursor,
      });

      if (!response.error && response.data) {
        return response.data;
      }
    } catch {
      // РРіРЅРѕСЂРёСЂСѓРµРј СЃРµС‚РµРІС‹Рµ СЃР±РѕРё С‚СЂР°РЅСЃРїРѕСЂС‚Р° РїРµСЂРµРґ РІС‹Р±СЂРѕСЃРѕРј DomainExceptions
    }

    DomainExceptions.serviceUnavailable(
      ErrorStatus.NOTIFICATIONS_SERVICE_UNAVAILABLE,
      'notifications',
      'Notifications service is temporarily unavailable',
    );
  }
}
