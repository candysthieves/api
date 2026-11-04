import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetNotificationsContract } from '@libs/contracts';
import { PaginatedNotificationsViewType } from '../../api/view-types/paginated-notifications-view.type.js';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository.js';
import { NotificationsMapper } from '../../api/mappers/notifications.mapper.js';

export class GetNotificationsQuery {
  constructor(public readonly dto: GetNotificationsContract) {}
}

@QueryHandler(GetNotificationsQuery)
export class GetNotificationsQueryHandler implements IQueryHandler<
  GetNotificationsQuery,
  PaginatedNotificationsViewType
> {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async execute(
    query: GetNotificationsQuery,
  ): Promise<PaginatedNotificationsViewType> {
    const { userId, pageSize = 10, cursor } = query.dto;

    const ids =
      await this.notificationsRepository.findUserNotificationsByCursorDate(
        userId,
        pageSize,
        cursor,
      );

    const hasMore = ids.length > pageSize;
    const paginatedIds = hasMore ? ids.slice(0, pageSize) : ids;

    if (!paginatedIds.length) {
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const notifications =
      await this.notificationsRepository.findByIds(paginatedIds);

    const notificationMap = new Map(notifications.map((n) => [n.id, n]));
    const items = paginatedIds
      .map((id) => notificationMap.get(id))
      .filter((n): n is NonNullable<typeof n> => Boolean(n))
      .map((n) => NotificationsMapper.toView(n));

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }
}
