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

    const isReadCursor = cursor?.startsWith('read:');
    const cursorDate = cursor ? cursor.replace(/^(unread:|read:)/, '') : null;
    const before = cursorDate ? new Date(cursorDate).getTime() : Infinity;
    const notifications =
      await this.notificationsRepository.findByUserId(userId);

    const unread = notifications.filter((notification) => !notification.isRead);
    const read = notifications.filter((notification) => notification.isRead);
    const beforeCursor = (notification: (typeof notifications)[number]) =>
      new Date(notification.createdAt).getTime() < before;
    const ordered = isReadCursor
      ? read.filter(beforeCursor)
      : [...unread.filter(beforeCursor), ...read];
    const hasMore = ordered.length > pageSize;
    const items = ordered
      .slice(0, pageSize)
      .map((notification) => NotificationsMapper.toView(notification));
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? `${lastItem.isRead ? 'read:' : 'unread:'}${lastItem.createdAt}`
        : null;
    return { items, nextCursor, hasMore };
  }
}
