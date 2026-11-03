export enum NotificationType {
  SUBSCRIPTION_ACTIVATED = 'SUBSCRIPTION_ACTIVATED',
  PAYMENT_UPCOMING = 'PAYMENT_UPCOMING',
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
}

export interface NotificationModel {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
