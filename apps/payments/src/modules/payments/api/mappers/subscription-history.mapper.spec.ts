import { SubscriptionHistoryMapper } from './subscription-history.mapper.js';
import type { SubscriptionHistoryRow } from '../../infrastructure/repositories/payments/payments.query.repository.js';

describe('SubscriptionHistoryMapper', () => {
  const row: SubscriptionHistoryRow = {
    id: 'payment-id',
    createdAtSeconds: Date.parse('2026-10-27T10:00:00Z') / 1000,
    paymentDateSeconds: Date.parse('2026-10-27T10:01:00Z') / 1000,
    amount: '100',
    provider: 'YOOKASSA',
    status: 'succeeded',
    subscriptionName: 'Test - 5 minutes',
    subscriptionType: 'Business',
    durationDays: 5 / 1440,
  };

  it('uses the payment amount and computes fractional-day duration from payment time', () => {
    expect(SubscriptionHistoryMapper.toView(row)).toEqual({
      id: 'payment-id',
      date: '2026-10-27T10:00:00.000Z',
      paymentDate: '2026-10-27T10:01:00.000Z',
      subscriptionEndDate: '2026-10-27T10:06:00.000Z',
      priceInMinorUnits: 100,
      currency: 'USD',
      subscriptionName: 'Test - 5 minutes',
      subscriptionType: 'Business',
      paymentService: 'YOOKASSA',
      status: 'succeeded',
    });
  });

  it.each(['pending', 'canceled', 'failed'] as const)(
    'keeps %s attempts without inventing payment dates',
    (status) => {
      expect(
        SubscriptionHistoryMapper.toView({
          ...row,
          status,
          paymentDateSeconds: null,
        }),
      ).toMatchObject({ status, paymentDate: null, subscriptionEndDate: null });
    },
  );

  it('handles whole-day tariffs across month boundaries', () => {
    expect(
      SubscriptionHistoryMapper.toView({ ...row, durationDays: 30 })
        .subscriptionEndDate,
    ).toBe('2026-11-26T10:01:00.000Z');
  });
});
