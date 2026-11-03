import { randomUUID } from 'node:crypto';
import { CreateNotificationContract } from '@libs/contracts';
import {
  NotificationModel,
  NotificationType,
} from '../../../../database/models/notification.model.js';

export class NotificationFactory {
  static create(dto: CreateNotificationContract): NotificationModel {
    return {
      id: randomUUID(),
      user_id: dto.userId,
      type:
        (dto.type as NotificationType) ??
        NotificationType.SUBSCRIPTION_ACTIVATED,
      title: dto.title,
      message: dto.message,
      is_read: false,
      created_at: new Date().toISOString(),
      read_at: null,
    };
  }

  static markAsRead(notification: NotificationModel): NotificationModel {
    return {
      ...notification,
      is_read: true,
      read_at: new Date().toISOString(),
    };
  }
}
