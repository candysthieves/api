export enum NotificationType {
  PAYMENT = 'PAYMENT',
}

export interface NotificationModel {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
