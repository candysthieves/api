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
    const reminders = [
      {
        title: NotificationTitle.PAYMENT_SUCCESSFUL,
        executeAt: paidAt + 30_000,
        message: 'Your subscription has been successfully activated.',
      },
      {
        title: NotificationTitle.NEXT_PAYMENT_IN_ONE_DAY,
        executeAt:
          input.nextChargeDate === null
            ? null
            : new Date(input.nextChargeDate).getTime() - DAY_MS,
        message: 'Your next subscription payment will be charged in one day.',
      },
      {
        title: NotificationTitle.SUBSCRIPTION_EXPIRES_IN_ONE_DAY,
        executeAt: expirationDate - DAY_MS,
        message: 'Your subscription expires in one day.',
      },
      {
        title: NotificationTitle.SUBSCRIPTION_EXPIRES_IN_SEVEN_DAYS,
        executeAt: expirationDate - 7 * DAY_MS,
        message: 'Your subscription expires in seven days.',
      },
    ];

    return reminders.map(({ title, executeAt, message }, index) => ({
      eventId: `${input.paymentId}:notification:${index}`,
      consumer: 'NOTIFICATIONS',
      type: 'payment.notification.scheduled',
      data: {
        userId: input.userId,
        paymentId: input.paymentId,
        subscriptionId: input.subscriptionId,
        paidAt,
        executeAt,
        enabledToExecute: executeAt !== null && executeAt >= paidAt,
        type: NotificationType.PAYMENT,
        title,
        message,
      },
    }));
  }
}
