import type { NotificationItemContract } from './paginated-notifications.contract.js';

export const DELIVER_NOTIFICATION = 'deliver-notification';
export const NOTIFICATION_SOCKET_KEY_PREFIX = 'notifications:socket:';

export type DeliverNotificationContract = {
  userId: string;
  socketId: string;
  notification: NotificationItemContract;
};

export type DeliverNotificationResult = { success: true };
