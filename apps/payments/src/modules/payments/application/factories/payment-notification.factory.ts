import {
  NotificationTitle,
  NotificationType,
  type PaymentNotificationScheduledEvent,
} from '@libs/contracts';

const DAY_MS = 86_400_000;

export type PaymentNotificationInput = {
  userId: string;
  paymentId: string;
  subscriptionId: string;
  paidAt: Date | string;
  expirationDate: Date | string;
  nextChargeDate: Date | string | null;
};

export class PaymentNotificationFactory {
  static create(
    input: PaymentNotificationInput,
  ): PaymentNotificationScheduledEvent[] {
    const paidAt = new Date(input.paidAt).getTime();
    const expirationDate = new Date(input.expirationDate).getTime();
    const events: PaymentNotificationScheduledEvent[] = [];

    const addNotification = (
      title: NotificationTitle,
      executeAt: number,
      message: string,
    ): void => {
      // Сравниваем с датой оплаты, чтобы задержка обработки не отбрасывала уведомления.
      if (executeAt < paidAt) {
        return;
      }

      events.push({
        // Для одного платежа и заголовка ID одинаков при повторной обработке.
        eventId: `${input.paymentId}:notification:${title}`,
        consumer: 'NOTIFICATIONS',
        type: 'payment.notification.scheduled',
        data: {
          userId: input.userId,
          paymentId: input.paymentId,
          subscriptionId: input.subscriptionId,
          paidAt,
          executeAt,
          type: NotificationType.PAYMENT,
          title,
          message,
        },
      });
    };

    addNotification(
      NotificationTitle.PAYMENT_SUCCESSFUL,
      paidAt + 30_000,
      'Your subscription has been successfully activated.',
    );

    // Без даты следующего списания соответствующее напоминание не создаём.
    if (input.nextChargeDate !== null) {
      addNotification(
        NotificationTitle.NEXT_PAYMENT_IN_ONE_DAY,
        new Date(input.nextChargeDate).getTime() - DAY_MS,
        'Your next subscription payment will be charged in one day.',
      );
    }

    addNotification(
      NotificationTitle.SUBSCRIPTION_EXPIRES_IN_ONE_DAY,
      expirationDate - DAY_MS,
      'Your subscription expires in one day.',
    );

    addNotification(
      NotificationTitle.SUBSCRIPTION_EXPIRES_IN_SEVEN_DAYS,
      expirationDate - 7 * DAY_MS,
      'Your subscription expires in seven days.',
    );

    // Здесь события только создаются; вызывающий код сохраняет их в outbox.
    return events;
  }
}
