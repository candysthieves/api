import { validate, version } from 'uuid';
import { paymentNotificationEventId } from './payment-notification-event-id.js';

describe('paymentNotificationEventId', () => {
  const paymentId = '1bc6db29-946c-45a0-a5d8-c550fcc364f3';

  it('preserves the persisted UUID v5 identity across retries and releases', () => {
    const id = paymentNotificationEventId(paymentId);
    expect(id).toBe('c87ff85b-3871-5066-8669-9588a3224461');
    expect(validate(id)).toBe(true);
    expect(version(id)).toBe(5);
    expect(paymentNotificationEventId(paymentId)).toBe(id);
    expect(id).not.toBe(paymentId);
  });

  it('assigns distinct identities to different payments', () => {
    expect(
      paymentNotificationEventId('550e8400-e29b-41d4-a716-446655440000'),
    ).not.toBe(paymentNotificationEventId(paymentId));
  });
});
