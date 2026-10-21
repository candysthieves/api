export class ConfirmPaymentContract {
  provider: 'STRIPE' | 'YOOKASSA';
  eventId: string; // id события провайдера (для идемпотентности)
  externalPaymentId: string; // id платежа на стороне провайдера
  userId: string; // id пользователя
  status: 'succeeded' | 'failed';
}
