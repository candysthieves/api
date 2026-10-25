jest.mock(
  '../../infrastructure/repositories/payments/payments.repository.js',
  () => ({ PaymentsRepository: class {} }),
);
jest.mock('../../../../events/outbox/outbox.service.js', () => ({
  OutboxService: class {},
}));

import { PaymentStatusService } from './payment-status.service.js';
import type { PaymentEntity } from '../../../../database/types/payment-database.type.js';

describe('PaymentStatusService', () => {
  let payment: PaymentEntity;
  const repository = {
    findByExternalPaymentId: jest.fn(),
    updateStatus: jest.fn(),
    findExpired: jest.fn(),
  };
  const provider = { getPayment: jest.fn() };
  const store = { save: jest.fn() };
  let service: PaymentStatusService;

  beforeEach(() => {
    jest.resetAllMocks();
    payment = {
      id: 'local-id',
      externalPaymentId: 'external-id',
      userId: '42',
      provider: 'YOOKASSA',
      status: 'pending',
      amount: 8333,
      currency: 'RUB',
      tariffId: 'tariff',
      paymentMethodId: null,
      paymentDate: null,
      createdAt: new Date(),
    };
    repository.findByExternalPaymentId.mockImplementation(() =>
      Promise.resolve({ ...payment }),
    );
    repository.updateStatus.mockImplementation(
      (_id: string, status: PaymentEntity['status'], method: string | null) => {
        payment.status = status;
        payment.paymentMethodId = method;
        return Promise.resolve();
      },
    );
    repository.findExpired.mockImplementation(() =>
      Promise.resolve([{ ...payment }]),
    );
    provider.getPayment.mockResolvedValue({
      status: 'succeeded',
      payment_method: { id: 'saved-method', saved: true },
    });
    service = new PaymentStatusService(
      repository as unknown as ConstructorParameters<
        typeof PaymentStatusService
      >[0],
      provider as unknown as ConstructorParameters<
        typeof PaymentStatusService
      >[1],
      store as unknown as ConstructorParameters<typeof PaymentStatusService>[2],
    );
  });

  it('saves success and reusable method before creating the completion event', async () => {
    store.save.mockImplementation(() => {
      expect(payment.status).toBe('succeeded');
      expect(payment.paymentMethodId).toBe('saved-method');
      return Promise.resolve();
    });
    await service.process('external-id');
    expect(store.save).toHaveBeenCalledWith({
      eventId: 'local-id',
      consumer: 'MAIN',
      type: 'payment.completed',
      data: { userId: '42', paymentStatus: 'completed' },
    });
  });

  it('recovers an outbox failure from the saved succeeded payment without another provider request', async () => {
    store.save.mockRejectedValueOnce(new Error('outbox unavailable'));
    await expect(service.process('external-id')).rejects.toThrow(
      'outbox unavailable',
    );
    expect(payment.status).toBe('succeeded');
    await service.process('external-id');
    expect(provider.getPayment).toHaveBeenCalledTimes(1);
    expect(store.save).toHaveBeenCalledTimes(2);
    expect(store.save.mock.calls[0]).toEqual(store.save.mock.calls[1]);
  });

  it('does not store a payment method that the provider did not save', async () => {
    provider.getPayment.mockResolvedValue({
      status: 'succeeded',
      payment_method: { id: 'temporary-method', saved: false },
    });
    await service.process('external-id');
    expect(payment.status).toBe('succeeded');
    expect(payment.paymentMethodId).toBeNull();
  });

  it.each(['canceled', 'failed', 'refunded'] as const)(
    'ignores a locally %s payment',
    async (status) => {
      payment.status = status;
      await service.process('external-id');
      expect(provider.getPayment).not.toHaveBeenCalled();
      expect(repository.updateStatus).not.toHaveBeenCalled();
      expect(store.save).not.toHaveBeenCalled();
    },
  );

  it('records cancellation without producing a Business event', async () => {
    provider.getPayment.mockResolvedValue({ status: 'canceled' });
    await service.process('external-id');
    expect(payment.status).toBe('canceled');
    expect(store.save).not.toHaveBeenCalled();
  });

  it.each(['pending', 'waiting_for_capture'])(
    'does not grant Business for provider status %s',
    async (status) => {
      provider.getPayment.mockResolvedValue({ status });
      await service.process('external-id');
      expect(payment.status).toBe('pending');
      expect(store.save).not.toHaveBeenCalled();
    },
  );

  it('leaves the payment unchanged when the provider fails', async () => {
    provider.getPayment.mockRejectedValueOnce(
      new Error('provider unavailable'),
    );
    await expect(service.process('external-id')).rejects.toThrow(
      'provider unavailable',
    );
    expect(payment.status).toBe('pending');
    expect(store.save).not.toHaveBeenCalled();
  });

  it('retries a notification whose payment has not been persisted yet', async () => {
    repository.findByExternalPaymentId.mockResolvedValueOnce(undefined);
    await expect(service.process('external-id')).rejects.toThrow(
      'PAYMENT_NOT_FOUND',
    );
    expect(provider.getPayment).not.toHaveBeenCalled();
  });

  it('cancels an expired pending payment locally, including on repeat runs', async () => {
    await service.cancelExpired();
    await service.cancelExpired();
    expect(payment.status).toBe('canceled');
    expect(repository.updateStatus).toHaveBeenCalledTimes(1);
    expect(provider.getPayment).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
  });

  it('does not cancel an already completed payment', async () => {
    payment.status = 'succeeded';
    await service.cancelExpired();
    expect(payment.status).toBe('succeeded');
    expect(repository.updateStatus).not.toHaveBeenCalledWith(
      'local-id',
      'canceled',
      null,
    );
  });
});
