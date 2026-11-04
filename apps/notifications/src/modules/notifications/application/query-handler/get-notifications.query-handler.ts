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

    // Парсим курсор вида "read:2026-11-04T..." или "unread:2026-11-04T..."
    // Для обратной совместимости: если префикса нет, считаем "read"
    let cursorSection: 'unread' | 'read' = 'unread';
    let cursorDate: string | null = null;

    if (cursor) {
      if (cursor.startsWith('unread:')) {
        cursorSection = 'unread';
        cursorDate = cursor.slice('unread:'.length);
      } else if (cursor.startsWith('read:')) {
        cursorSection = 'read';
        cursorDate = cursor.slice('read:'.length);
      } else {
        cursorSection = 'read';
        cursorDate = cursor;
      }
    }

    const selectedIds: string[] = [];
    let nextCursor: string | null = null;
    let hasMore = false;

    // 1. Если курсор еще в unread, выбираем сначала непрочитанные
    if (cursorSection === 'unread') {
      const unreadIds: string[] =
        await this.notificationsRepository.findUnreadIds(
          userId,
          pageSize + 1,
          cursorDate,
        );

      if (unreadIds.length > pageSize) {
        // Непрочитанных больше pageSize - остаемся в секции unread
        selectedIds.push(...unreadIds.slice(0, pageSize));
        hasMore = true;
      } else {
        // Забираем все оставшиеся непрочитанные
        selectedIds.push(...unreadIds);

        const neededFromRead = pageSize - selectedIds.length;
        if (neededFromRead > 0) {
          // Добираем из прочитанных (с самого начала, т.к. только перешли)
          const readIds: string[] =
            await this.notificationsRepository.findReadIds(
              userId,
              neededFromRead + 1,
              null,
            );

          if (readIds.length > neededFromRead) {
            selectedIds.push(...readIds.slice(0, neededFromRead));
            hasMore = true;
          } else {
            selectedIds.push(...readIds);
            hasMore = false;
          }
        }
      }
    } else {
      // 2. Курсор уже в секции прочитанных
      const readIds: string[] = await this.notificationsRepository.findReadIds(
        userId,
        pageSize + 1,
        cursorDate,
      );

      if (readIds.length > pageSize) {
        selectedIds.push(...readIds.slice(0, pageSize));
        hasMore = true;
      } else {
        selectedIds.push(...readIds);
        hasMore = false;
      }
    }

    if (!selectedIds.length) {
      return NotificationsMapper.toPaginatedView({
        orderedIds: [],
        models: [],
        nextCursor: null,
        hasMore: false,
      });
    }

    // 3. Загружаем модели
    const notifications =
      await this.notificationsRepository.findByIds(selectedIds);
    const notificationMap = new Map(notifications.map((n) => [n.id, n]));

    // 4. Вычисляем nextCursor по последнему элементу
    if (hasMore && selectedIds.length > 0) {
      const lastId = selectedIds[selectedIds.length - 1];
      const lastModel = notificationMap.get(lastId);
      if (lastModel) {
        const sectionPrefix = lastModel.isRead ? 'read:' : 'unread:';
        nextCursor = `${sectionPrefix}${lastModel.createdAt}`;
      }
    }

    return NotificationsMapper.toPaginatedView({
      orderedIds: selectedIds,
      models: notifications,
      nextCursor,
      hasMore,
    });
  }
}
