import { PaymentsConfig } from '../../../../../payments.config.js';
import { YookassaService } from './yookassa.service.js';

describe('YookassaService', () => {
  const config = {
    yooKassaShopId: 'shop',
    yooKassaSecretKey: 'private-secret',
    frontendUrl: 'https://app.example/',
  } as PaymentsConfig;
  let service: YookassaService;
  let createPaymentSpy: jest.SpyInstance;
  let getPaymentSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new YookassaService(config);
    const checkout = (
      service as unknown as {
        checkout: {
          createPayment: (...args: unknown[]) => unknown;
          getPayment: (...args: unknown[]) => unknown;
        };
      }
    ).checkout;
    createPaymentSpy = jest.spyOn(checkout, 'createPayment');
    getPaymentSpy = jest.spyOn(checkout, 'getPayment');
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates a redirect payment and requests method saving with a stable key', async () => {
    createPaymentSpy.mockResolvedValue({
      id: 'provider-id',
      status: 'pending',
      paid: false,
      confirmation: { confirmation_url: 'https://pay.example' },
    });
    const result = await service.createPayment({
      paymentId: 'local-id',
      amount: 1234,
      currency: 'USD',
      description: 'Subscription',
      durationDays: 30,
    });
    expect(createPaymentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: { value: '1038.16', currency: 'RUB' },
        capture: true,
        save_payment_method: true,
        metadata: { paymentId: 'local-id' },
        confirmation: {
          type: 'redirect',
          return_url: 'https://app.example/payment/success?paymentId=local-id',
        },
      }),
      'local-id',
    );
    expect(result).toEqual({
      externalPaymentId: 'provider-id',
      paymentUrl: 'https://pay.example',
    });
  });

  it('charges a saved method with the requested idempotency key', async () => {
    createPaymentSpy.mockResolvedValue({ id: 'provider-id' });
    await service.chargeSavedPaymentMethod({
      paymentMethodId: 'saved-id',
      amount: 500,
      currency: 'USD',
      description: 'Renewal',
      idempotencyKey: 'attempt-key',
    });
    expect(createPaymentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_id: 'saved-id',
        amount: { value: '420.65', currency: 'RUB' },
        capture: true,
      }),
      'attempt-key',
    );
  });

  it('does not leak credentials in provider errors', async () => {
    getPaymentSpy.mockRejectedValue(new Error('HTTP 401'));
    await expect(service.getPaymentByProviderId('provider-id')).rejects.toThrow(
      'HTTP 401',
    );
    await expect(
      service.getPaymentByProviderId('provider-id'),
    ).rejects.not.toThrow('private-secret');
  });
});
