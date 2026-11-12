import type { PaymentNotificationScheduledEvent } from '@libs/contracts';
import type { ScheduledNotificationModel } from '../../../../database/models/scheduled-notification.model.js';

export class ScheduledNotificationFactory {
  static create(
    event: PaymentNotificationScheduledEvent,
  ): ScheduledNotificationModel {
    return {
      ...event.data,
      id: event.eventId,
      executedAt: null,
      attempts: 0,
      lastError: null,
    };
  }
}
