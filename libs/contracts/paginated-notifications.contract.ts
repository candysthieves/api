export enum NotificationType {
  PAYMENT = 'PAYMENT',
}

export type NotificationItemContract = {
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
