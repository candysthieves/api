import { PaymentNotificationFactory } from './payment-notification.factory.js';
import { NotificationTitle } from '@libs/contracts';

describe('Payment notification schedule', () => {
  const input = {
    userId: '42',
    paymentId: 'payment',
    subscriptionId: 'subscription',
    paidAt: '2026-11-11T10:00:00Z',
    expirationDate: '2026-12-11T10:00:00Z',
    nextChargeDate: '2026-12-11T10:00:00Z',
  };

  it('creates four distinct stable events with subscription-based deadlines', () => {
    const events = PaymentNotificationFactory.create(input);
    expect(events).toHaveLength(4);
    expect(new Set(events.map((event) => event.eventId)).size).toBe(4);
    expect(events).toEqual(PaymentNotificationFactory.create(input));
    expect(events.map((event) => event.data.executeAt)).toEqual([
      Date.parse('2026-11-11T10:00:30Z'),
      Date.parse('2026-12-10T10:00:00Z'),
      Date.parse('2026-12-10T10:00:00Z'),
      Date.parse('2026-12-04T10:00:00Z'),
    ]);
  });

  it('omits a charge reminder if cancellation has already cleared its date', () => {
    const events = PaymentNotificationFactory.create({
      ...input,
      nextChargeDate: null,
    });
    expect(events).toHaveLength(3);
    expect(events.map((event) => event.data.title)).not.toContain(
      NotificationTitle.NEXT_PAYMENT_IN_ONE_DAY,
    );
    expect(events.map((event) => event.eventId)).toEqual([
      `payment:notification:${NotificationTitle.PAYMENT_SUCCESSFUL}`,
      `payment:notification:${NotificationTitle.SUBSCRIPTION_EXPIRES_IN_ONE_DAY}`,
      `payment:notification:${NotificationTitle.SUBSCRIPTION_EXPIRES_IN_SEVEN_DAYS}`,
    ]);
  });

  it('creates only activation for a five-minute subscription', () => {
    const events = PaymentNotificationFactory.create({
      ...input,
      expirationDate: '2026-11-11T10:05:00Z',
      nextChargeDate: '2026-11-11T10:05:00Z',
    });
    expect(events).toHaveLength(1);
    expect(events[0].data.title).toBe(NotificationTitle.PAYMENT_SUCCESSFUL);
    expect(events[0].data.executeAt).toBe(Date.parse(input.paidAt) + 30_000);
  });

  it('creates three reminders for one day, even on delayed processing', () => {
    const events = PaymentNotificationFactory.create({
      ...input,
      expirationDate: '2026-11-12T10:00:00Z',
      nextChargeDate: '2026-11-12T10:00:00Z',
    });
    expect(events).toHaveLength(3);
    expect(events.map((event) => event.data.executeAt)).toEqual([
      Date.parse(input.paidAt) + 30_000,
      Date.parse(input.paidAt),
      Date.parse(input.paidAt),
    ]);
  });
});
