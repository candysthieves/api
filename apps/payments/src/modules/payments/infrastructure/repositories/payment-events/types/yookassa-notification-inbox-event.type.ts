export type YooKassaNotificationInboxEvent = {
  eventId: string;
  consumer: 'PAYMENTS';
  type: 'yookassa.notification.received';
  data: { providerPaymentId: string };
};
