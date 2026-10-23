import { SubscriptionRenewalFactory } from './subscription-renewal.factory.js';

describe('SubscriptionRenewalFactory', () => {
  it('calculates the next period from the successful payment time', () => {
    expect(
      SubscriptionRenewalFactory.nextChargeAt(
        new Date('2026-10-01T12:00:00.000Z'),
        30,
      ),
    ).toEqual(new Date('2026-10-31T12:00:00.000Z'));
  });
});
