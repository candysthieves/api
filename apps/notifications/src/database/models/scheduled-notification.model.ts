import type { PaymentNotificationScheduledEvent } from '@libs/contracts';

export type ScheduledNotificationModel =
  PaymentNotificationScheduledEvent['data'] & {
    id: string;
    executedAt: number | null;
    attempts: number;
    lastError: string | null;
  };
