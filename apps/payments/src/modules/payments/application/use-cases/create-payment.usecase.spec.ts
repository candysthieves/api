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
  const tariff = { name: 'Daily', durationDays: 1, price: '100' };
  const tariffs = { findTariffById: jest.fn().mockResolvedValue(tariff) };
  const payments = {
    create: jest.fn<Promise<void>, [Record<string, unknown>]>(),
  };
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

  it('stores USD cents while sending kopecks to YooKassa', async () => {
    const result = await usecase.execute(
      new CreatePaymentCommand('42', 1, 'YOOKASSA'),
    );
    expect(payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: result.paymentId,
        userId: '42',
        externalPaymentId: 'provider-payment',
        tariffId: 1,
        amount: 100,
        status: 'pending',
        paymentMethodId: null,
      }),
    );
    expect(provider.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 8333, currency: 'RUB' }),
    );
    expect(result.paymentUrl).toBe('https://pay.example/1');
    expect(payments.create.mock.calls[0][0]).not.toHaveProperty('currency');
    expect(payments.create.mock.calls[0][0]).not.toHaveProperty(
      'amountMinorUnits',
    );
  });

  it('preserves USD cents for Stripe', async () => {
    await usecase.execute(new CreatePaymentCommand('42', 1, 'STRIPE'));
    expect(payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100 }),
    );
    expect(payments.create.mock.calls[0][0]).not.toHaveProperty('currency');
    expect(provider.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100, currency: 'USD' }),
    );
  });

  it('does not save a pending payment when the provider fails', async () => {
    provider.createPayment.mockRejectedValueOnce(new Error('unavailable'));
    await expect(
      usecase.execute(new CreatePaymentCommand('42', 1, 'YOOKASSA')),
    ).rejects.toThrow('unavailable');
    expect(payments.create).not.toHaveBeenCalled();
  });

  it('does not return a URL when persistence fails', async () => {
    payments.create.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      usecase.execute(new CreatePaymentCommand('42', 1, 'YOOKASSA')),
    ).rejects.toThrow('database unavailable');
  });
});
