jest.mock(
  '../../infrastructure/repositories/payments/payments.repository.js',
  () => ({ PaymentsRepository: class {} }),
);
jest.mock('../../../../events/outbox/outbox.service.js', () => ({
  OutboxService: class {},
}));
jest.mock(
  '../../infrastructure/repositories/subscriptions/subscriptions.repository.js',
  () => ({ SubscriptionsRepository: class {} }),
);
jest.mock(
  '../../infrastructure/repositories/tariffs/tariffs.repository.js',
  () => ({ TariffsRepository: class {} }),
);
import { PaymentStatusService } from './payment-status.service.js';
import type { PaymentEntity } from '../../../../database/types/payment-database.type.js';

describe('PaymentStatusService', () => {
  let payment: PaymentEntity;
  let subscriptionStatus: string;
  const paidAt = new Date('2026-10-26T12:00:00Z');
  const repository = {
    findByExternalPaymentId: jest.fn(),
    updateStatus: jest.fn(),
    findExpired: jest.fn(),
  };
  const provider = { getPayment: jest.fn() };
  const store = { save: jest.fn() };
  const subscriptions = {
    complete: jest.fn(),
    fail: jest.fn(),
    findByLastPaymentId: jest.fn(),
  };
  const tariffs = { findTariffById: jest.fn() };
  const service = new PaymentStatusService(
    repository as unknown as ConstructorParameters<
      typeof PaymentStatusService
    >[0],
    provider as unknown as ConstructorParameters<
      typeof PaymentStatusService
    >[1],
    store as unknown as ConstructorParameters<typeof PaymentStatusService>[2],
    subscriptions as unknown as ConstructorParameters<
      typeof PaymentStatusService
    >[3],
    tariffs as unknown as ConstructorParameters<typeof PaymentStatusService>[4],
  );
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(paidAt);
    subscriptionStatus = 'Processing';
    tariffs.findTariffById.mockResolvedValue({ durationDays: 30 });
    payment = {
      id: 'local-id',
      externalPaymentId: 'external-id',
      userId: '42',
      provider: 'YOOKASSA',
      status: 'pending',
      amount: 100,
      tariffId: 1,
      paymentMethodId: null,
      paymentDate: null,
      createdAt: new Date(),
    };
    repository.findByExternalPaymentId.mockImplementation(() =>
      Promise.resolve({ ...payment }),
    );
    repository.findExpired.mockImplementation(() =>
      Promise.resolve(payment.status === 'pending' ? [{ ...payment }] : []),
    );
    repository.updateStatus.mockImplementation(
      (
        _id: string,
        status: PaymentEntity['status'],
        method: string | null,
        paymentDate: Date | null,
      ) => {
        payment.status = status;
        payment.paymentMethodId = method;
        payment.paymentDate = paymentDate;
        return Promise.resolve();
      },
    );
    subscriptions.complete.mockImplementation(() => {
      subscriptionStatus = 'Done';
      return Promise.resolve();
    });
    subscriptions.findByLastPaymentId.mockImplementation(() =>
      Promise.resolve({ id: 'subscription', status: subscriptionStatus }),
    );
    subscriptions.fail.mockImplementation(() => {
      subscriptionStatus = 'Failed';
      return Promise.resolve();
    });
    provider.getPayment.mockResolvedValue({
      status: 'succeeded',
      payment_method: { id: 'saved-method', saved: true },
    });
  });

  afterEach(() => jest.useRealTimers());

  it('completes the subscription found by lastPaymentId using the saved payment date before publishing Business', async () => {
    store.save.mockImplementation(() => {
      expect(payment.status).toBe('succeeded');
      expect(subscriptionStatus).toBe('Done');
      expect(payment.paymentMethodId).toBe('saved-method');
      expect(payment.paymentDate).toEqual(paidAt);
      return Promise.resolve();
    });
    await service.process('external-id');
    expect(subscriptions.complete).toHaveBeenCalledWith(
      'subscription',
      'local-id',
      30,
      paidAt,
    );
    expect(subscriptions.findByLastPaymentId).toHaveBeenCalledWith('local-id');
    expect(store.save).toHaveBeenCalledWith({
      eventId: 'local-id',
      consumer: 'MAIN',
      type: 'payment.completed',
      data: { userId: '42', paymentStatus: 'completed' },
    });
  });

  it('does not extend an already completed subscription on a duplicate webhook', async () => {
    payment.status = 'succeeded';
    payment.paymentDate = paidAt;
    jest.setSystemTime(new Date('2026-10-27T12:00:00Z'));
    subscriptionStatus = 'Done';
    await service.process('external-id');
    expect(subscriptions.complete).not.toHaveBeenCalled();
    expect(tariffs.findTariffById).not.toHaveBeenCalled();
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(payment.paymentDate).toEqual(paidAt);
  });

  it.each(['pending', 'canceled', 'failed'] as const)(
    'accepts late success for a %s payment after the subscription timeout',
    async (status) => {
      payment.status = status;
      subscriptionStatus = 'Failed';
      await service.process('external-id');
      expect(payment.status).toBe('succeeded');
      expect(subscriptionStatus).toBe('Done');
      expect(store.save).toHaveBeenCalledTimes(1);
    },
  );

  it('recovers subscription persistence failure without another provider request', async () => {
    subscriptions.complete.mockRejectedValueOnce(
      new Error('subscription unavailable'),
    );
    await expect(service.process('external-id')).rejects.toThrow(
      'subscription unavailable',
    );
    expect(payment.status).toBe('succeeded');
    expect(store.save).not.toHaveBeenCalled();
    jest.setSystemTime(new Date('2026-10-27T12:00:00Z'));
    await service.process('external-id');
    expect(payment.paymentDate).toEqual(paidAt);
    expect(subscriptions.complete).toHaveBeenLastCalledWith(
      'subscription',
      'local-id',
      30,
      paidAt,
    );
    expect(provider.getPayment).toHaveBeenCalledTimes(1);
    expect(subscriptionStatus).toBe('Done');
    expect(store.save).toHaveBeenCalledTimes(1);
  });

  it('recovers an outbox failure from the saved succeeded payment', async () => {
    store.save.mockRejectedValueOnce(new Error('outbox unavailable'));
    await expect(service.process('external-id')).rejects.toThrow(
      'outbox unavailable',
    );
    await service.process('external-id');
    expect(provider.getPayment).toHaveBeenCalledTimes(1);
    expect(store.save.mock.calls[0]).toEqual(store.save.mock.calls[1]);
    expect(subscriptions.complete).toHaveBeenCalledTimes(1);
  });

  it('does not save a method that YooKassa did not mark as saved', async () => {
    provider.getPayment.mockResolvedValue({
      status: 'succeeded',
      payment_method: { id: 'temporary', saved: false },
    });
    await service.process('external-id');
    expect(payment.paymentMethodId).toBeNull();
  });

  it('marks the subscription Failed on cancellation without granting Business', async () => {
    provider.getPayment.mockResolvedValue({ status: 'canceled' });
    store.save.mockImplementation(() => {
      expect(payment.status).toBe('canceled');
      expect(subscriptionStatus).toBe('Failed');
      return Promise.resolve();
    });
    await service.process('external-id');
    expect(payment.status).toBe('canceled');
    expect(subscriptionStatus).toBe('Failed');
    expect(payment.paymentDate).toBeNull();
    expect(store.save).toHaveBeenCalledWith({
      eventId: 'local-id',
      consumer: 'MAIN',
      type: 'payment.canceled',
      data: { userId: '42', paymentStatus: 'canceled' },
    });
    expect(subscriptions.complete).not.toHaveBeenCalled();
  });

  it('retries cancellation outbox persistence with the same payment ID', async () => {
    provider.getPayment.mockResolvedValue({ status: 'canceled' });
    store.save.mockRejectedValueOnce(new Error('outbox unavailable'));
    await expect(service.process('external-id')).rejects.toThrow(
      'outbox unavailable',
    );
    await service.process('external-id');
    expect(store.save.mock.calls[0]).toEqual(store.save.mock.calls[1]);
    expect(store.save.mock.calls[1][0].eventId).toBe(payment.id);
  });

  it('does not emit cancellation before subscription persistence succeeds', async () => {
    provider.getPayment.mockResolvedValue({ status: 'canceled' });
    subscriptions.fail.mockRejectedValueOnce(
      new Error('subscription unavailable'),
    );
    await expect(service.process('external-id')).rejects.toThrow(
      'subscription unavailable',
    );
    expect(store.save).not.toHaveBeenCalled();
  });

  it.each(['pending', 'waiting_for_capture'])(
    'does not complete the subscription for provider status %s',
    async (status) => {
      provider.getPayment.mockResolvedValue({ status });
      await service.process('external-id');
      expect(payment.status).toBe('pending');
      expect(subscriptionStatus).toBe('Processing');
      expect(store.save).not.toHaveBeenCalled();
    },
  );

  it('leaves payment unchanged on a provider error', async () => {
    provider.getPayment.mockRejectedValueOnce(new Error('unavailable'));
    await expect(service.process('external-id')).rejects.toThrow('unavailable');
    expect(payment.status).toBe('pending');
    expect(store.save).not.toHaveBeenCalled();
  });

  it('retries a webhook if its payment is not yet persisted', async () => {
    repository.findByExternalPaymentId.mockResolvedValueOnce(undefined);
    await expect(service.process('external-id')).rejects.toThrow(
      'PAYMENT_NOT_FOUND',
    );
    expect(provider.getPayment).not.toHaveBeenCalled();
  });

  it('cancels a pending payment that has no external ID after a creation timeout', async () => {
    payment.externalPaymentId = null;
    await service.cancelExpired();
    await service.cancelExpired();
    expect(payment.status).toBe('canceled');
    expect(repository.updateStatus).toHaveBeenCalledTimes(1);
    expect(provider.getPayment).not.toHaveBeenCalled();
  });

  it('does not cancel an already succeeded payment', async () => {
    payment.status = 'succeeded';
    await service.cancelExpired();
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('does not grant Business or update another subscription when lastPaymentId no longer matches', async () => {
    subscriptions.findByLastPaymentId.mockResolvedValue(undefined);
    await expect(service.process('external-id')).rejects.toThrow(
      'SUBSCRIPTION_NOT_FOUND',
    );
    expect(subscriptions.complete).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
  });
});
