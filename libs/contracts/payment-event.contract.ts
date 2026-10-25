export type PaymentWebhookEvent = {
  eventId: string;
  consumer: 'PAYMENTS';
  type: 'payment.status.requested';
  data: { externalPaymentId: string };
};

export type PaymentCompletedEvent = {
  eventId: string;
  consumer: 'MAIN';
  type: 'payment.completed';
  data: { userId: string; paymentStatus: 'completed' };
};
