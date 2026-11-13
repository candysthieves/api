import type { NotificationTitle } from './notification-title.contract.js';
import type { NotificationType } from './paginated-notifications.contract.js';

export type PaymentNotificationCompletedEvent = {
  /** Internal payment ID; also used for deduplication. */
  eventId: string;
  consumer: 'NOTIFICATIONS';
  type: 'payment.completed';
  data: {
    userId: string;
    paymentId: string;
    subscriptionId: string;
    paidAt: string;
    expirationDate: string;
    nextChargeDate: string | null;
  };
};

export type PaymentNotificationCanceledEvent = {
  /** Internal payment ID; also used for deduplication. */
  eventId: string;
  consumer: 'NOTIFICATIONS';
  type: 'payment.canceled';
  data: {
    userId: string;
    paymentId: string;
  };
};

export type PaymentNotificationEvent =
  | PaymentNotificationCompletedEvent
  | PaymentNotificationCanceledEvent
  | PaymentNotificationScheduledEvent
  | SubscriptionNotificationCanceledEvent;

export type PaymentNotificationScheduledEvent = {
  eventId: string;
  consumer: 'NOTIFICATIONS';
  type: 'payment.notification.scheduled';
  data: {
    userId: string;
    paymentId: string;
    subscriptionId: string;
    paidAt: number;
    executeAt: number;
    type: NotificationType;
    title: NotificationTitle;
    message: string;
  };
};

export type SubscriptionNotificationCanceledEvent = {
  eventId: string;
  consumer: 'NOTIFICATIONS';
  type: 'subscription.notifications.canceled';
  data: { userId: string; paymentId: string };
};
