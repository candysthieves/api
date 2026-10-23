import { ProcessYookassaNotificationUseCase } from './process-yookassa-notification.usecase.js';

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

describe('ProcessYookassaNotificationUseCase', () => {
  const paidAt = new Date('2026-10-17T10:00:00.000Z');
  const payment = {
    id: 'local',
    provider: 'YOOKASSA',
    tariffId: 'tariff',
    userExternalPaymentId: '42',
    amountMinorUnits: '1200',
    status: 'pending',
  };

  function createUseCase(
    subscriptionAlreadyActivated = false,
    durationMinutes?: number,
  ) {
    const payments = {
      findByProviderPaymentId: jest.fn().mockResolvedValue(payment),
      findById: jest.fn(),
      setProviderPaymentId: jest.fn(),
      confirmPayment: jest.fn(),
    };
    const tariffs = {
      findTariffById: jest.fn().mockResolvedValue({
        id: 'tariff',
        priceInMinorUnits: '1200',
        durationDays: 30,
      }),
    };
    const subscriptionsQuery = {
      findByPaymentId: jest
        .fn()
        .mockResolvedValue(
          subscriptionAlreadyActivated ? { id: 'sub' } : undefined,
        ),
      findActiveSubscription: jest.fn().mockResolvedValue(undefined),
    };
    const subscriptions = {
      updateFromSuccessfulPayment: jest.fn(),
      createFromSuccessfulPayment: jest.fn(),
    };
    const paymentEvents = { enqueueStatus: jest.fn() };
    const yookassa = {
      getPaymentByProviderId: jest.fn().mockResolvedValue({
        id: 'provider',
        status: 'succeeded',
        paid: true,
        amount: { value: '1009.56', currency: 'RUB' },
        metadata: { paymentId: 'local' },
        payment_method: { id: 'saved', saved: true },
        captured_at: paidAt.toISOString(),
      }),
    };

    return {
      payments,
      subscriptions,
      paymentEvents,
      useCase: new ProcessYookassaNotificationUseCase(
        payments as never,
        tariffs as never,
        subscriptions as never,
        subscriptionsQuery as never,
        paymentEvents as never,
        yookassa as never,
        { get: jest.fn().mockReturnValue(durationMinutes) } as never,
      ),
    };
  }

  it('activates access and publishes the confirmed payment status', async () => {
    const { payments, subscriptions, paymentEvents, useCase } = createUseCase();

    await useCase.execute({ providerPaymentId: 'provider' });

    expect(subscriptions.createFromSuccessfulPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '42',
        paymentMethodId: 'saved',
        expirationDate: new Date('2026-11-16T10:00:00.000Z'),
        nextChargeDate: new Date('2026-11-16T10:00:00.000Z'),
      }),
    );
    expect(payments.confirmPayment).toHaveBeenCalledWith('local', paidAt);
    expect(paymentEvents.enqueueStatus).toHaveBeenCalledWith(
      'local',
      'succeeded',
    );
  });

  it('sets the initial subscription renewal date to the configured minute', async () => {
    const { subscriptions, useCase } = createUseCase(false, 1);

    await useCase.execute({ providerPaymentId: 'provider' });

    const oneMinuteAfterPayment = new Date('2026-10-17T10:01:00.000Z');
    expect(subscriptions.createFromSuccessfulPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        expirationDate: oneMinuteAfterPayment,
        nextChargeDate: oneMinuteAfterPayment,
      }),
    );
  });

  it('finishes confirming the payment when subscription activation was already saved', async () => {
    const { payments, subscriptions, paymentEvents, useCase } =
      createUseCase(true);

    await useCase.execute({ providerPaymentId: 'provider' });

    expect(subscriptions.createFromSuccessfulPayment).not.toHaveBeenCalled();
    expect(subscriptions.updateFromSuccessfulPayment).not.toHaveBeenCalled();
    expect(payments.confirmPayment).toHaveBeenCalledWith('local', paidAt);
    expect(paymentEvents.enqueueStatus).toHaveBeenCalledWith(
      'local',
      'succeeded',
    );
  });
});
