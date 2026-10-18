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

describe('ProcessYookassaNotificationUseCase', () => {
  it('activates access only after authoritative successful confirmation', async () => {
    const paidAt = new Date('2026-10-17T10:00:00.000Z');
    const payments = {
      findByProviderPaymentId: jest.fn().mockResolvedValue({
        id: 'local',
        provider: 'YOOKASSA',
        tariffId: 'tariff',
        userExternalPaymentId: '42',
        status: 'pending',
      }),
      confirmPayment: jest.fn(),
      setProviderPaymentId: jest.fn(),
    };
    const tariffs = {
      findTariffById: jest.fn().mockResolvedValue({
        id: 'tariff',
        priceInMinorUnits: '1200',
        durationDays: 30,
      }),
    };
    const subscriptions = { activateFromSuccessfulPayment: jest.fn() };
    const yookassa = {
      getPayment: jest.fn().mockResolvedValue({
        id: 'provider',
        status: 'succeeded',
        paid: true,
        amount: { value: '12.00', currency: 'USD' },
        metadata: { paymentId: 'local' },
        payment_method: { id: 'saved', saved: true },
        captured_at: paidAt.toISOString(),
      }),
    };
    const useCase = new ProcessYookassaNotificationUseCase(
      payments as never,
      tariffs as never,
      subscriptions as never,
      yookassa as never,
    );

    await useCase.execute({ providerPaymentId: 'provider' });

    expect(payments.confirmPayment).toHaveBeenCalledWith('local', paidAt);
    expect(subscriptions.activateFromSuccessfulPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '42',
        paymentMethodId: 'saved',
        expirationDate: new Date('2026-11-16T10:00:00.000Z'),
        nextChargeDate: new Date('2026-11-16T10:00:00.000Z'),
      }),
    );
  });

  it('ignores a mismatched local payment identity', async () => {
    const payments = {
      findByProviderPaymentId: jest
        .fn()
        .mockResolvedValue({ id: 'other-local', provider: 'YOOKASSA' }),
      findById: jest.fn(),
      confirmPayment: jest.fn(),
    };
    const yookassa = {
      getPayment: jest.fn().mockResolvedValue({
        id: 'provider',
        status: 'succeeded',
        paid: true,
        metadata: { paymentId: 'local' },
      }),
    };
    const useCase = new ProcessYookassaNotificationUseCase(
      payments as never,
      {} as never,
      {} as never,
      yookassa as never,
    );
    await useCase.execute({ providerPaymentId: 'provider' });
    expect(payments.confirmPayment).not.toHaveBeenCalled();
  });

  it('does not reactivate a payment already applied before the user cancelled', async () => {
    const payments = {
      findByProviderPaymentId: jest.fn().mockResolvedValue({
        id: 'local',
        provider: 'YOOKASSA',
        status: 'succeeded',
      }),
      confirmPayment: jest.fn(),
    };
    const subscriptions = { activateFromSuccessfulPayment: jest.fn() };
    const yookassa = {
      getPayment: jest.fn().mockResolvedValue({
        id: 'provider',
        status: 'succeeded',
        paid: true,
        metadata: { paymentId: 'local' },
      }),
    };
    const useCase = new ProcessYookassaNotificationUseCase(
      payments as never,
      {} as never,
      subscriptions as never,
      yookassa as never,
    );

    await useCase.execute({ providerPaymentId: 'provider' });

    expect(subscriptions.activateFromSuccessfulPayment).not.toHaveBeenCalled();
    expect(payments.confirmPayment).not.toHaveBeenCalled();
  });
});
