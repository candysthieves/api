jest.mock(
  '../../infrastructure/repositories/subscriptions/subscriptions.repository.js',
  () => ({ SubscriptionsRepository: class {} }),
);
jest.mock('./main-tcp.service.js', () => ({ MainTcpService: class {} }));
jest.mock('../use-cases/renew-subscriptions.usecase.js', () => ({
  RenewSubscriptionsCommand: class {},
}));
import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { SubscriptionExpirationService } from './subscription-expiration.service.js';
import { SubscriptionsScheduler } from '../subscriptions.scheduler.js';
import type { SubscriptionEntity } from '../../../../database/types/payment-database.type.js';

describe('Subscription expiration', () => {
  const subscription: SubscriptionEntity = {
    id: 'subscription',
    userId: '42',
    tariffId: 1,
    lastPaymentId: 'payment',
    provider: 'YOOKASSA',
    status: 'Processing',
    expirationDate: null,
    nextChargeDate: null,
    createdAt: new Date('2026-10-26T12:00:00Z'),
  };
  const repository = {
    findPaidSubscription: jest.fn(),
    fail: jest.fn(),
    findExpiredProcessing: jest.fn(),
  };
  const main = { setPersonal: jest.fn() };
  const service = new SubscriptionExpirationService(
    repository as unknown as ConstructorParameters<
      typeof SubscriptionExpirationService
    >[0],
    main as unknown as ConstructorParameters<
      typeof SubscriptionExpirationService
    >[1],
  );
  const scheduler = new SubscriptionsScheduler(
    {} as CommandBus,
    repository as unknown as ConstructorParameters<
      typeof SubscriptionsScheduler
    >[1],
    service,
  );
  let userStatus: string;
  let state: string;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    userStatus = 'Business';
    state = 'Processing';
    main.setPersonal.mockImplementation(() => {
      userStatus = 'Personal';
      return Promise.resolve();
    });
    repository.fail.mockImplementation(() => {
      state = 'Failed';
      return Promise.resolve();
    });
    repository.findExpiredProcessing.mockImplementation(() =>
      Promise.resolve(state === 'Processing' ? [subscription] : []),
    );
  });
  afterEach(() => jest.restoreAllMocks());

  it('does not mark Failed until the user update has completed', async () => {
    let confirm!: () => void;
    let started!: () => void;
    const pending = new Promise<void>((resolve) => {
      confirm = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    main.setPersonal.mockImplementation(async () => {
      started();
      await pending;
      userStatus = 'Personal';
    });
    const processing = service.fail(subscription);
    await entered;
    expect(state).toBe('Processing');
    expect(repository.fail).not.toHaveBeenCalled();
    confirm();
    await processing;
    expect(state).toBe('Failed');
    expect(userStatus).toBe('Personal');
  });

  it('retains Processing on failure and retries on the next scheduler tick', async () => {
    main.setPersonal.mockRejectedValueOnce(new Error('unavailable'));
    await scheduler.failExpiredProcessing();
    expect(state).toBe('Processing');
    expect(userStatus).toBe('Business');
    await scheduler.failExpiredProcessing();
    expect(state).toBe('Failed');
    expect(userStatus).toBe('Personal');
  });

  it('can retry if main succeeded but persisting Failed failed', async () => {
    repository.fail.mockRejectedValueOnce(new Error('database unavailable'));
    await scheduler.failExpiredProcessing();
    expect(userStatus).toBe('Personal');
    expect(state).toBe('Processing');
    await scheduler.failExpiredProcessing();
    expect(state).toBe('Failed');
  });

  it('keeps Business until an older paid period ends, even after failure', async () => {
    repository.findPaidSubscription.mockResolvedValueOnce({ id: 'paid' });
    await service.fail(subscription);
    expect(state).toBe('Failed');
    expect(userStatus).toBe('Business');
    await service.expire(subscription.userId);
    expect(userStatus).toBe('Personal');
  });

  it('does not revoke access when checking paid periods fails', async () => {
    repository.findPaidSubscription.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(service.fail(subscription)).rejects.toThrow(
      'database unavailable',
    );
    expect(state).toBe('Processing');
    expect(userStatus).toBe('Business');
  });

  it('preserves existing failure behavior for other providers without changing User', async () => {
    await service.fail({ ...subscription, provider: 'STRIPE' });
    expect(state).toBe('Failed');
    expect(userStatus).toBe('Business');
  });

  it('continues processing the next user after one fails', async () => {
    repository.findExpiredProcessing.mockResolvedValue([
      subscription,
      { ...subscription, id: 'second', userId: '43' },
    ]);
    main.setPersonal.mockRejectedValueOnce(new Error('unavailable'));
    await scheduler.failExpiredProcessing();
    expect(repository.fail).not.toHaveBeenCalledWith('subscription');
    expect(repository.fail).toHaveBeenCalledWith('second');
  });
});
