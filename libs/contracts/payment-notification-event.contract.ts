export type PaymentNotificationCompletedEvent = {
  /** Stable UUID v5 derived from the payment ID; used for deduplication. */
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
  /** Stable UUID v5 derived from the payment ID; used for deduplication. */
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
