import { NotificationModel } from '../../../../database/models/notification.model.js';
import { NotificationsCountViewType } from '../view-types/notifications-count-view.type.js';
import { NotificationViewType } from '../view-types/notification-view.type.js';
import { PaginatedNotificationsViewType } from '../view-types/paginated-notifications-view.type.js';

export class NotificationsMapper {
  static toCountView(count: number): NotificationsCountViewType {
    return {
      count,
    };
  }

  static toView(model: NotificationModel): NotificationViewType {
    return {
      id: model.id,
      type: model.type,
      title: model.title,
      message: model.message,
      isRead: model.isRead,
      readAt: model.readAt,
      createdAt: model.createdAt,
    };
  }

  static toPaginatedView(params: {
    orderedIds: string[];
    models: NotificationModel[];
    nextCursor: string | null;
    hasMore: boolean;
  }): PaginatedNotificationsViewType {
    const { orderedIds, models, nextCursor, hasMore } = params;

    const notificationMap = new Map(models.map((model) => [model.id, model]));

    const items: NotificationViewType[] = orderedIds
      .map((id) => notificationMap.get(id))
      .filter((model): model is NonNullable<typeof model> => Boolean(model))
      .map((model) => NotificationsMapper.toView(model));

    return {
      items,
      nextCursor,
      hasMore,
    };
  }
}
