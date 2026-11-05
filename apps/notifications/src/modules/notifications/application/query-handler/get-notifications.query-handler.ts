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

    // 1. Понимаем, где находится курсор: в unread или в read
    const isReadCursor = cursor?.startsWith('read:');
    const cursorDate = cursor ? cursor.replace(/^(unread:|read:)/, '') : null;

    let ids: string[] = [];
    let hasMore = false;

    if (!isReadCursor) {
      // Ищем в непрочитанных
      ids = await this.notificationsRepository.findUnreadIds(
        userId,
        pageSize + 1,
        cursorDate,
      );

      if (ids.length > pageSize) {
        hasMore = true;
        ids = ids.slice(0, pageSize);
      } else {
        // Если непрочитанных не хватило — добираем из прочитанных
        const needed = pageSize - ids.length;
        const readIds = await this.notificationsRepository.findReadIds(
          userId,
          needed + 1,
        );

        hasMore = readIds.length > needed;
        ids.push(...readIds.slice(0, needed));
      }
    } else {
      // Курсор уже в прочитанных — просто берем из read
      ids = await this.notificationsRepository.findReadIds(
        userId,
        pageSize + 1,
        cursorDate,
      );

      hasMore = ids.length > pageSize;
      ids = ids.slice(0, pageSize);
    }

    if (!ids.length) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    // 2. Достаем сущности
    const notifications = await this.notificationsRepository.findByIds(ids);
    const map = new Map(notifications.map((n) => [n.id, n]));
    const items = ids
      .map((id) => map.get(id))
      .filter((n): n is NonNullable<typeof n> => Boolean(n))
      .map((n) => NotificationsMapper.toView(n));

    // 3. nextCursor по последнему элементу
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? `${lastItem.isRead ? 'read:' : 'unread:'}${lastItem.createdAt}`
        : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }
}
