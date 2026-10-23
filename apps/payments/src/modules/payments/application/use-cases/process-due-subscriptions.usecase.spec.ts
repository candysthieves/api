import { ProcessDueSubscriptionsUseCase } from './process-due-subscriptions.usecase.js';

jest.mock(
  '../../infrastructure/repositories/payments/payments.repository.js',
  () => ({ PaymentsRepository: class {} }),
);
jest.mock(
  '../../infrastructure/repositories/tariffs/tariffs.repository.js',
  () => ({ TariffsRepository: class {} }),
);
jest.mock(
  '../../infrastructure/repositories/subscriptions/subscriptions.repository.js',
  () => ({ SubscriptionsRepository: class {} }),
);
jest.mock(
  '../../infrastructure/repositories/subscriptions/subscriptions.query.repository.js',
  () => ({ SubscriptionsQueryRepository: class {} }),
);
jest.mock(
  '../../infrastructure/repositories/payment-events.repository.js',
  () => ({ PaymentEventsRepository: class {} }),
);

describe('ProcessDueSubscriptionsUseCase', () => {
  const at = new Date('2026-10-17T10:00:00.000Z');
  const subscription = {
    id: 'subscription-id',
    userId: '42',
    tariffId: 'tariff-id',
    paymentMethodId: 'saved-id',
    nextChargeDate: at.toISOString(),
    cancellationRequestedAt: null,
  };

  function createUseCase(
    providerPayment: Record<string, unknown>,
    currentSubscription = subscription,
    durationMinutes?: number,
  ) {
    const subscriptionsQuery = {
      findDueForRenewal: jest.fn().mockResolvedValue([subscription]),
      findById: jest.fn().mockResolvedValue(currentSubscription),
    };
    const subscriptions = {
      markRenewalSucceeded: jest.fn(),
      markRenewalFailed: jest.fn(),
    };
    const payments = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(undefined),
      setProviderPaymentId: jest.fn(),
      confirmPayment: jest.fn(),
      failPayment: jest.fn(),
    };
    const paymentEvents = { enqueueStatus: jest.fn() };
    const tariffs = {
      findTariffById: jest.fn().mockResolvedValue({
        id: 'tariff-id',
        name: 'Monthly',
        priceInMinorUnits: '1200',
        durationDays: 30,
      }),
    };
    const yookassa = {
      chargeSavedPaymentMethod: jest.fn().mockResolvedValue(providerPayment),
      getPaymentByProviderId: jest.fn(),
    };
    const useCase = new ProcessDueSubscriptionsUseCase(
      subscriptions as never,
      subscriptionsQuery as never,
      payments as never,
      paymentEvents as never,
      tariffs as never,
      yookassa as never,
      { get: jest.fn().mockReturnValue(durationMinutes) } as never,
    );

    return { subscriptions, payments, paymentEvents, yookassa, useCase };
  }

  it('extends access after a successful renewal', async () => {
    const paidAt = new Date('2026-10-17T10:03:00.000Z');
    const { subscriptions, payments, paymentEvents, yookassa, useCase } =
      createUseCase({
        id: 'provider-payment',
        status: 'succeeded',
        paid: true,
        captured_at: paidAt.toISOString(),
      });

    await useCase.execute({ at });

    expect(yookassa.chargeSavedPaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethodId: 'saved-id',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        idempotencyKey: expect.any(String),
      }),
    );
    expect(subscriptions.markRenewalSucceeded).toHaveBeenCalledWith(
      'subscription-id',
      expect.any(String),
      new Date('2026-11-16T10:03:00.000Z'),
    );
    expect(paymentEvents.enqueueStatus).toHaveBeenCalledWith(
      expect.any(String),
      'succeeded',
    );
    expect(payments.failPayment).not.toHaveBeenCalled();
  });

  it('uses the configured minute duration after a successful renewal', async () => {
    const { subscriptions, useCase } = createUseCase(
      {
        id: 'provider-payment',
        status: 'succeeded',
        paid: true,
        captured_at: at.toISOString(),
      },
      subscription,
      1,
    );

    await useCase.execute({ at });

    expect(subscriptions.markRenewalSucceeded).toHaveBeenCalledWith(
      'subscription-id',
      expect.any(String),
      new Date('2026-10-17T10:01:00.000Z'),
    );
  });

  it('does not extend access after a declined renewal', async () => {
    const { subscriptions, payments, paymentEvents, useCase } = createUseCase({
      id: 'provider-payment',
      status: 'canceled',
      paid: false,
    });

    await useCase.execute({ at });

    expect(payments.failPayment).toHaveBeenCalledWith(expect.any(String));
    expect(subscriptions.markRenewalFailed).toHaveBeenCalledWith(
      'subscription-id',
    );
    expect(subscriptions.markRenewalSucceeded).not.toHaveBeenCalled();
    expect(paymentEvents.enqueueStatus).toHaveBeenCalledWith(
      expect.any(String),
      'failed',
    );
  });

  it('does not charge a subscription cancelled after the due list was read', async () => {
    const { payments, yookassa, useCase } = createUseCase(
      {},
      {
        ...subscription,
        cancellationRequestedAt: at,
      },
    );

    await useCase.execute({ at });

    expect(yookassa.chargeSavedPaymentMethod).not.toHaveBeenCalled();
    expect(payments.create).not.toHaveBeenCalled();
  });
});
