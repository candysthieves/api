import type { PaymentNotificationScheduledEvent } from '@libs/contracts';

export type ScheduledNotificationModel =
  PaymentNotificationScheduledEvent['data'] & {
    /** Redis key: executeAt:userId:paymentId:notificationId. */
    id: string;
    notificationId: string;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
  };
