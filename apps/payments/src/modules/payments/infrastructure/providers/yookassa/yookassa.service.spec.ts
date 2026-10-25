import { YookassaService } from './yookassa.service.js';
import { PaymentsConfig } from '../../../../../payments.config.js';

describe('YookassaService', () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch');
  const service = new YookassaService({
    yookassaShopId: 'test-shop',
    yookassaSecretKey: 'test-key',
    frontendUrl: 'https://frontend.example/',
  } as PaymentsConfig);
  afterAll(() => fetchMock.mockRestore());

  it('sends a RUB redirect payment with saved method requested and returns its URL', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'external',
          confirmation: { confirmation_url: 'https://pay.example/1' },
        }),
      ),
    );
    const result = await service.createPayment({
      paymentId: 'local',
      amount: 8333,
      currency: 'RUB',
      description: 'Daily',
      durationDays: 1,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.yookassa.ru/v3/payments');
    expect(JSON.parse(init!.body as string)).toEqual({
      amount: { value: '83.33', currency: 'RUB' },
      capture: true,
      save_payment_method: true,
      description: 'Daily',
      confirmation: {
        type: 'redirect',
        return_url: 'https://frontend.example/payment/success?paymentId=local',
      },
    });
    expect((init!.headers as Record<string, string>)['Idempotence-Key']).toBe(
      'local',
    );
    expect(result).toEqual({
      externalPaymentId: 'external',
      paymentUrl: 'https://pay.example/1',
    });
  });

  it('does not expose the provider response body when creation fails', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('provider internal details', { status: 401 }),
    );
    await expect(
      service.createPayment({
        paymentId: 'local',
        amount: 100,
        currency: 'RUB',
        description: 'Daily',
        durationDays: 1,
      }),
    ).rejects.toMatchObject({
      error: { error: { code: 'PAYMENT_CREATION_FAILED' } },
    });
  });
});
