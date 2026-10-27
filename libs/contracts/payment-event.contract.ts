export type PaymentWebhookEvent = {
  eventId: string;
  consumer: 'PAYMENTS';
  type: 'payment.status.requested';
  data: { externalPaymentId: string };
};

export type PaymentCompletedEvent = {
  /** Internal payment ID; also used for deduplication. */
  eventId: string;
  consumer: 'MAIN';
  type: 'payment.completed';
  data: { userId: string; paymentStatus: 'completed' };
};

export type PaymentCanceledEvent = {
  /** Internal payment ID; also used for deduplication. */
  eventId: string;
  consumer: 'MAIN';
  type: 'payment.canceled';
  data: { userId: string; paymentStatus: 'canceled' };
};

export type PaymentResultEvent = PaymentCompletedEvent | PaymentCanceledEvent;
