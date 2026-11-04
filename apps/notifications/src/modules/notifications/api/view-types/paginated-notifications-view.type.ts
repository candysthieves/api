import { NotificationViewType } from './notification-view.type.js';

export type PaginatedNotificationsViewType = {
  items: NotificationViewType[];
  nextCursor: string | null;
  hasMore: boolean;
};
