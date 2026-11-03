import { NotificationModel } from '../../../../database/models/notification.model.js';
import { NotificationViewType } from '../view-types/notification-view.type.js';

export class NotificationsMapper {
  static toView(model: NotificationModel): NotificationViewType {
    return {
      id: model.id,
      user_id: model.user_id,
      type: model.type,
      title: model.title,
      message: model.message,
      is_read: model.is_read,
      created_at: model.created_at,
      read_at: model.read_at,
    };
  }

  static toViews(models: NotificationModel[]): NotificationViewType[] {
    return models.map((model) => this.toView(model));
  }
}
