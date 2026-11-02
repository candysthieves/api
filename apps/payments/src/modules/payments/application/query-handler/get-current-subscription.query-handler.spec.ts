jest.mock(
  '../../infrastructure/repositories/subscriptions/subscriptions.repository.js',
  () => ({
    SubscriptionsRepository: class {},
  }),
);

import { GetCurrentSubscriptionQueryHandler } from './get-current-subscription.query-handler.js';

describe('GetCurrentSubscriptionQueryHandler', () => {
  const expirationDate = new Date('2030-02-01T00:00:00Z');

  it.each([new Date('2030-01-31T00:00:00Z'), null])(
    'returns the scheduled charge date %s independently of paid access',
    async (nextChargeDate) => {
      const repository = {
        findCurrentSubscription: jest.fn().mockResolvedValue({
          expirationDateSeconds: expirationDate.getTime() / 1000,
          nextChargeDateSeconds:
            nextChargeDate === null ? null : nextChargeDate.getTime() / 1000,
        }),
      };
      const handler = new GetCurrentSubscriptionQueryHandler(
        repository as unknown as ConstructorParameters<
          typeof GetCurrentSubscriptionQueryHandler
        >[0],
      );
      await expect(handler.execute({ userId: '42' })).resolves.toEqual({
        expirationDate: expirationDate.toISOString(),
        nextChangeDate: nextChargeDate?.toISOString() ?? null,
      });
    },
  );

  it('returns no dates when there is no active subscription', async () => {
    const repository = {
      findCurrentSubscription: jest.fn().mockResolvedValue(undefined),
    };
    const handler = new GetCurrentSubscriptionQueryHandler(
      repository as unknown as ConstructorParameters<
        typeof GetCurrentSubscriptionQueryHandler
      >[0],
    );
    await expect(handler.execute({ userId: '42' })).resolves.toEqual({
      expirationDate: null,
      nextChangeDate: null,
    });
  });
});
