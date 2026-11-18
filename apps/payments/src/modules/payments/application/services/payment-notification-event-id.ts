import { v5 as uuidv5 } from 'uuid';

// Persisted event IDs depend on this namespace and name format. Never change them.
const NOTIFICATION_NAMESPACE = '9e7e582d-7e31-4c4e-ae0f-c951230c7d41';

export function paymentNotificationEventId(paymentId: string): string {
  return uuidv5(`${paymentId}:notification`, NOTIFICATION_NAMESPACE);
}
