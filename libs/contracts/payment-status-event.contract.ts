export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export type PaymentStatusChangedEvent = {
  eventId: string;
  consumer: 'MAIN';
  type: 'payment.status.changed';
  data: {
    paymentId: string;
    status: PaymentStatus;
    occurredAt: string;
  };
};
