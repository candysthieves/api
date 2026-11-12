export const SAVE_NOTIFICATION_SESSION = 'save-notification-session';
export const REMOVE_NOTIFICATION_SESSION = 'remove-notification-session';

export type NotificationSessionContract = {
  userId: string;
  socketId: string;
};

export type NotificationSessionResult = { success: true };
