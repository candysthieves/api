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
    expect(events.every((event) => event.data.enabledToExecute)).toBe(true);
  });

  it('keeps the charge reminder disabled with no deadline when auto-renewal is off', () => {
    const events = PaymentNotificationFactory.create({
      ...input,
      nextChargeDate: null,
    });
    expect(events).toHaveLength(4);
    expect(events[1].data).toMatchObject({
      title: NotificationTitle.NEXT_PAYMENT_IN_ONE_DAY,
      executeAt: null,
      enabledToExecute: false,
    });
    expect(events.filter((event) => event.data.enabledToExecute)).toHaveLength(
      3,
    );
  });

  it('keeps past deadlines but disables their execution for a short subscription', () => {
    const events = PaymentNotificationFactory.create({
      ...input,
      expirationDate: '2026-11-12T10:00:00Z',
    });
    expect(events).toHaveLength(4);
    expect(events[3].data.executeAt).toBeLessThan(Date.parse(input.paidAt));
    expect(events[3].data.enabledToExecute).toBe(false);
  });

  it('enables only activation for a five-minute subscription', () => {
    const events = PaymentNotificationFactory.create({
      ...input,
      expirationDate: '2026-11-11T10:05:00Z',
      nextChargeDate: '2026-11-11T10:05:00Z',
    });
    expect(events.map((event) => event.data.enabledToExecute)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(events).toHaveLength(4);
  });

  it('keeps a reminder due exactly at the start of the paid period enabled', () => {
    const events = PaymentNotificationFactory.create({
      ...input,
      expirationDate: '2026-11-12T10:00:00Z',
      nextChargeDate: '2026-11-12T10:00:00Z',
    });
    expect(events[1].data.executeAt).toBe(Date.parse(input.paidAt));
    expect(events[1].data.enabledToExecute).toBe(true);
  });
});
