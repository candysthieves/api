export enum NotificationType {
  SUBSCRIPTION_ACTIVATED = 'SUBSCRIPTION_ACTIVATED',
  PAYMENT_UPCOMING = 'PAYMENT_UPCOMING',
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
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
