jest.mock(
  '../../infrastructure/repositories/payments/payments.repository.js',
  () => ({ PaymentsRepository: class {} }),
);
jest.mock(
  '../../infrastructure/repositories/tariffs/tariffs.repository.js',
  () => ({ TariffsRepository: class {} }),
);
jest.mock('../../infrastructure/providers/payment-provider.factory.js', () => ({
  PaymentProviderFactory: class {},
}));

import {
  CreatePaymentCommand,
  CreatePaymentUseCase,
} from './create-payment.use-case.js';

describe('CreatePaymentUseCase', () => {
  const tariff = { name: 'Daily', durationDays: 1, priceInMinorUnits: '100' };
  const tariffs = { findTariffById: jest.fn().mockResolvedValue(tariff) };
  const payments = { create: jest.fn() };
  const provider = { createPayment: jest.fn() };
  const factory = { getProvider: jest.fn().mockReturnValue(provider) };
  const usecase = new CreatePaymentUseCase(
    tariffs as unknown as ConstructorParameters<typeof CreatePaymentUseCase>[0],
    payments as unknown as ConstructorParameters<
      typeof CreatePaymentUseCase
    >[1],
    factory as unknown as ConstructorParameters<typeof CreatePaymentUseCase>[2],
  );

  beforeEach(() => {
    jest.clearAllMocks();
    provider.createPayment.mockResolvedValue({
      externalPaymentId: 'provider-payment',
      paymentUrl: 'https://pay.example/1',
    });
  });

  it('converts USD to kopecks and preserves the user and provider IDs separately', async () => {
    const result = await usecase.execute(
      new CreatePaymentCommand('42', 'tariff', 'YOOKASSA'),
    );
    expect(payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: result.paymentId,
        userId: '42',
        externalPaymentId: 'provider-payment',
        tariffId: 'tariff',
        amount: 8333,
        currency: 'RUB',
        status: 'pending',
        paymentMethodId: null,
      }),
    );
    expect(provider.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 8333, currency: 'RUB' }),
    );
    expect(result.paymentUrl).toBe('https://pay.example/1');
  });

  it('preserves USD cents for Stripe', async () => {
    await usecase.execute(new CreatePaymentCommand('42', 'tariff', 'STRIPE'));
    expect(payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100, currency: 'USD' }),
    );
  });

  it('does not save a pending payment when the provider fails', async () => {
    provider.createPayment.mockRejectedValueOnce(new Error('unavailable'));
    await expect(
      usecase.execute(new CreatePaymentCommand('42', 'tariff', 'YOOKASSA')),
    ).rejects.toThrow('unavailable');
    expect(payments.create).not.toHaveBeenCalled();
  });

  it('does not return a URL when persistence fails', async () => {
    payments.create.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      usecase.execute(new CreatePaymentCommand('42', 'tariff', 'YOOKASSA')),
    ).rejects.toThrow('database unavailable');
  });
});
