import { randomUUID } from 'node:crypto';
import type { PaymentNotificationScheduledEvent } from '@libs/contracts';
import type { ScheduledNotificationModel } from '../../../../database/models/scheduled-notification.model.js';

export class ScheduledNotificationFactory {
  static create(
    event: PaymentNotificationScheduledEvent,
  ): ScheduledNotificationModel {
    const notificationId = randomUUID();
    return {
      ...event.data,
      id: `${event.data.executeAt}:${event.data.userId}:${event.data.paymentId}:${notificationId}`,
      notificationId,
      isRead: false,
      readAt: null,
      createdAt: new Date(event.data.executeAt).toISOString(),
    };
  }
}
