import { NotificationModel } from '../../../../database/models/notification.model.js';
import { NotificationsCountViewType } from '../view-types/notifications-count-view.type.js';
import { NotificationViewType } from '../view-types/notification-view.type.js';

export class NotificationsMapper {
  static toCountView(count: number): NotificationsCountViewType {
    return {
      count,
    };
  }

  static toView(model: NotificationModel): NotificationViewType {
    return {
      id: model.id,
      user_id: model.userId,
      type: model.type,
      title: model.title,
      message: model.message,
      is_read: model.isRead,
      read_at: model.readAt,
      created_at: model.createdAt,
    };
  }
}
