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
      userId: dto.userId,
      type:
        (dto.type as NotificationType) ??
        NotificationType.SUBSCRIPTION_ACTIVATED,
      title: dto.title,
      message: dto.message,
      isRead: false,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
  }

  static markAsRead(notification: NotificationModel): NotificationModel {
    return {
      ...notification,
      isRead: true,
      readAt: new Date().toISOString(),
    };
  }
}
