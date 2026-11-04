import { NotificationType } from '../../../../database/models/notification.model.js';

export type NotificationViewType = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};
