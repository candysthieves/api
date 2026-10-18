import { PaymentsConfig } from '../../../../../payments.config.js';
import { YookassaService } from './yookassa.service.js';

describe('YookassaService', () => {
  const config = {
    yooKassaShopId: 'shop',
    yooKassaSecretKey: 'private-secret',
    frontendUrl: 'https://app.example/',
  } as PaymentsConfig;
  let service: YookassaService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new YookassaService(config);
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'provider-id',
          status: 'pending',
          paid: false,
          amount: { value: '12.34', currency: 'USD' },
          confirmation: { confirmation_url: 'https://pay.example' },
        }),
        { status: 200 },
      ),
    );
  });

  afterEach(() => fetchSpy.mockRestore());

  it('creates a redirect payment and requests method saving with a stable key', async () => {
    const result = await service.createPayment({
      paymentId: 'local-id',
      amount: 1234,
      currency: 'USD',
      description: 'Subscription',
      durationDays: 30,
    });
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as unknown;
    expect(url).toBe('https://api.yookassa.ru/v3/payments');
    expect(options.headers).toMatchObject({ 'Idempotence-Key': 'local-id' });
    expect(body).toMatchObject({
      amount: { value: '12.34', currency: 'USD' },
      capture: true,
      save_payment_method: true,
      metadata: { paymentId: 'local-id' },
    });
    expect(
      (body as { confirmation: { return_url: string } }).confirmation
        .return_url,
    ).toContain('https://app.example/payment/success');
    expect(result).toEqual({
      externalPaymentId: 'provider-id',
      paymentUrl: 'https://pay.example',
    });
  });

  it('charges a saved method with the requested idempotency key', async () => {
    await service.chargeSavedPaymentMethod({
      paymentMethodId: 'saved-id',
      amount: 500,
      currency: 'USD',
      description: 'Renewal',
      idempotencyKey: 'attempt-key',
    });
    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toMatchObject({ 'Idempotence-Key': 'attempt-key' });
    expect(JSON.parse(options.body as string)).toMatchObject({
      payment_method_id: 'saved-id',
      amount: { value: '5.00' },
      capture: true,
    });
  });

  it('does not leak credentials in provider errors', async () => {
    fetchSpy.mockResolvedValue(new Response('', { status: 401 }));
    await expect(service.getPaymentByProviderId('provider-id')).rejects.toThrow(
      'HTTP 401',
    );
    await expect(
      service.getPaymentByProviderId('provider-id'),
    ).rejects.not.toThrow('private-secret');
  });
});
