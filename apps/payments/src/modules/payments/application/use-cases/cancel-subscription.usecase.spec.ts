jest.mock(
  '../../infrastructure/repositories/subscriptions/subscriptions.repository.js',
  () => ({ SubscriptionsRepository: class {} }),
);
jest.mock('../../../../events/outbox/outbox.service.js', () => ({
  OutboxService: class {},
}));
import {
  CancelSubscriptionCommand,
  CancelSubscriptionUseCase,
} from './cancel-subscription.use-case.js';

describe('CancelSubscriptionUseCase notification cancellation', () => {
  const subscriptions = {
    findActiveSubscription: jest.fn(),
    requestCancellation: jest.fn(),
  };
  const outbox = { save: jest.fn() };
  const useCase = new CancelSubscriptionUseCase(
    subscriptions as unknown as ConstructorParameters<
      typeof CancelSubscriptionUseCase
    >[0],
    outbox as unknown as ConstructorParameters<
      typeof CancelSubscriptionUseCase
    >[1],
  );

  beforeEach(() => {
    jest.resetAllMocks();
    subscriptions.findActiveSubscription.mockResolvedValue({
      id: 'subscription',
      lastPaymentId: 'payment',
    });
  });

  it('does not cancel reminders when the user has no active subscription', async () => {
    subscriptions.findActiveSubscription.mockResolvedValue(undefined);
    expect(await useCase.execute(new CancelSubscriptionCommand('42'))).toBe(
      false,
    );
    expect(outbox.save).not.toHaveBeenCalled();
  });

  it('does not cancel reminders before the subscription cancellation is persisted', async () => {
    subscriptions.requestCancellation.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(
      useCase.execute(new CancelSubscriptionCommand('42')),
    ).rejects.toThrow('database unavailable');
    expect(outbox.save).not.toHaveBeenCalled();
  });

  it('reports outbox failure and retries cancellation with the same event identity', async () => {
    outbox.save.mockRejectedValueOnce(new Error('outbox unavailable'));
    await expect(
      useCase.execute(new CancelSubscriptionCommand('42')),
    ).rejects.toThrow('outbox unavailable');
    expect(await useCase.execute(new CancelSubscriptionCommand('42'))).toBe(
      true,
    );
    expect(outbox.save.mock.calls[0]).toEqual(outbox.save.mock.calls[1]);
    expect(outbox.save).toHaveBeenLastCalledWith({
      eventId: 'payment:notifications:cancel',
      consumer: 'NOTIFICATIONS',
      type: 'subscription.notifications.canceled',
      data: { userId: '42', paymentId: 'payment' },
    });
  });
});
