export enum NotificationType {
  PAYMENT = 'PAYMENT',
}

export type NotificationItemContract = {
  /** Public notification UUID; independent of the payment event ID. */
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type PaginatedNotificationsContract = {
  items: NotificationItemContract[];
  nextCursor: string | null;
  hasMore: boolean;
};
