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
  PaymentNotificationCompletedEvent | PaymentNotificationCanceledEvent;
