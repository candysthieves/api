import { ProcessDueSubscriptionsUseCase } from './process-due-subscriptions.usecase.js';
import type {
  CreateRecurringPaymentParams,
  YookassaPayment,
} from '../../infrastructure/providers/payment-provider.interface.js';

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
  '../../infrastructure/repositories/subscription-notifications/subscription-notifications.repository.js',
  () => ({ SubscriptionNotificationsRepository: class {} }),
);

describe('ProcessDueSubscriptionsUseCase', () => {
  const at = new Date('2026-10-17T10:00:00.000Z');
  const subscription = {
    id: 'subscription-id',
    userId: '42',
    tariffId: 'tariff-id',
    paymentMethodId: 'saved-id',
    retryCount: 0,
    nextChargeDate: at,
    cancellationRequestedAt: null,
  };

  it('starts a successful next period at the confirmed payment time', async () => {
    const subscriptions = {
      findDueForRenewal: jest.fn().mockResolvedValue([subscription]),
      prepareRenewalAttempt: jest.fn().mockResolvedValue(true),
      findById: jest.fn().mockResolvedValue(subscription),
      markRenewalSucceeded: jest.fn(),
    };
    const payments = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(undefined),
      setProviderPaymentId: jest.fn(),
      confirmPayment: jest.fn(),
    };
    const tariffs = {
      findTariffById: jest.fn().mockResolvedValue({
        id: 'tariff-id',
        name: 'Monthly',
        priceInMinorUnits: '1200',
        durationDays: 30,
      }),
    };
    const notifications = { createPending: jest.fn() };
    const yookassa = {
      createRecurringPayment: jest
        .fn<Promise<YookassaPayment>, [CreateRecurringPaymentParams]>()
        .mockResolvedValue({
          id: 'renewal-provider',
          status: 'succeeded',
          paid: true,
          captured_at: '2026-10-17T10:03:00.000Z',
        }),
    };
    const useCase = new ProcessDueSubscriptionsUseCase(
      subscriptions as never,
      payments as never,
      tariffs as never,
      notifications as never,
      yookassa as never,
    );

    await useCase.execute({ at });

    const chargeArgs = yookassa.createRecurringPayment.mock.calls[0][0];
    expect(chargeArgs.paymentMethodId).toBe('saved-id');
    expect(chargeArgs.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(subscriptions.markRenewalSucceeded).toHaveBeenCalledWith(
      'subscription-id',
      expect.any(String),
      new Date('2026-10-17T10:03:00.000Z'),
      30,
    );
    expect(notifications.createPending).not.toHaveBeenCalled();
  });

  it('keeps access for 24 hours and queues one first-failure notification', async () => {
    const subscriptions = {
      findDueForRenewal: jest.fn().mockResolvedValue([subscription]),
      prepareRenewalAttempt: jest.fn().mockResolvedValue(true),
      findById: jest.fn().mockResolvedValue(subscription),
      scheduleRetry: jest.fn(),
    };
    const payments = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(undefined),
      setProviderPaymentId: jest.fn(),
      failPayment: jest.fn(),
    };
    const tariffs = {
      findTariffById: jest.fn().mockResolvedValue({
        id: 'tariff-id',
        name: 'Monthly',
        priceInMinorUnits: '1200',
        durationDays: 30,
      }),
    };
    const notifications = { createPending: jest.fn() };
    const yookassa = {
      createRecurringPayment: jest.fn().mockResolvedValue({
        id: 'renewal-provider',
        status: 'canceled',
        paid: false,
      }),
    };
    const useCase = new ProcessDueSubscriptionsUseCase(
      subscriptions as never,
      payments as never,
      tariffs as never,
      notifications as never,
      yookassa as never,
    );

    await useCase.execute({ at });

    expect(subscriptions.scheduleRetry).toHaveBeenCalledWith(
      'subscription-id',
      new Date('2026-10-18T10:00:00.000Z'),
      expect.any(String),
    );
    expect(notifications.createPending).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '42',
        kind: 'RENEWAL_RETRY_SCHEDULED',
      }),
    );
  });
});
