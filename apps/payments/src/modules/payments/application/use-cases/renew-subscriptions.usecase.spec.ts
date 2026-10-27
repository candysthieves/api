jest.mock(
  '../../infrastructure/repositories/subscriptions/subscriptions.repository.js',
  () => ({ SubscriptionsRepository: class {} }),
);
jest.mock(
  '../../infrastructure/repositories/payments/payments.repository.js',
  () => ({ PaymentsRepository: class {} }),
);
jest.mock(
  '../../infrastructure/repositories/tariffs/tariffs.repository.js',
  () => ({ TariffsRepository: class {} }),
);
import { Logger } from '@nestjs/common';
import { RenewSubscriptionsUseCase } from './renew-subscriptions.usecase.js';
import type { PaymentFactory } from '../factories/payment.factory.js';

describe('RenewSubscriptionsUseCase', () => {
  const subscriptions = {
    findDueForYookassa: jest.fn(),
    updateSubscriptionsStatusToProcessing: jest.fn(),
    addPaymentIdToSubscriptions: jest.fn(),
  };
  const payments = {
    findById: jest.fn(),
    create: jest.fn<
      Promise<void>,
      [ReturnType<typeof PaymentFactory.create>]
    >(),
    addExternalPaymentId: jest.fn(),
  };
  const tariffs = { findTariffById: jest.fn() };
  const provider = { createAutoRenewalPayment: jest.fn() };
  let state: string;
  const subscription = {
    id: 'subscription',
    userId: '42',
    tariffId: 1,
    lastPaymentId: 'previous',
  };
  const usecase = new RenewSubscriptionsUseCase(
    subscriptions as unknown as ConstructorParameters<
      typeof RenewSubscriptionsUseCase
    >[0],
    payments as unknown as ConstructorParameters<
      typeof RenewSubscriptionsUseCase
    >[1],
    tariffs as unknown as ConstructorParameters<
      typeof RenewSubscriptionsUseCase
    >[2],
    provider as unknown as ConstructorParameters<
      typeof RenewSubscriptionsUseCase
    >[3],
  );
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    state = 'Done';
    subscriptions.findDueForYookassa.mockImplementation(() =>
      Promise.resolve(state === 'Done' ? [subscription] : []),
    );
    subscriptions.updateSubscriptionsStatusToProcessing.mockImplementation(
      () => {
        state = 'Processing';
        return Promise.resolve();
      },
    );
    payments.findById.mockResolvedValue({ paymentMethodId: 'saved-method' });
    tariffs.findTariffById.mockResolvedValue({
      name: 'Monthly',
      price: '100',
      durationDays: 30,
    });
    provider.createAutoRenewalPayment.mockImplementation(() => {
      expect(state).toBe('Processing');
      expect(payments.create).toHaveBeenCalledTimes(1);
      expect(subscriptions.addPaymentIdToSubscriptions).toHaveBeenCalledTimes(
        1,
      );
      return Promise.resolve({ id: 'external', status: 'succeeded' });
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('persists a new pending payment before charging and waits for the webhook', async () => {
    await usecase.execute();
    const payment = payments.create.mock.calls[0][0];
    expect(payment).toMatchObject({
      userId: '42',
      status: 'pending',
      amount: 100,
      externalPaymentId: null,
      paymentMethodId: 'saved-method',
    });
    expect(subscriptions.addPaymentIdToSubscriptions).toHaveBeenCalledWith(
      'subscription',
      payment.id,
    );
    expect(payments.findById).toHaveBeenCalledWith('previous');
    expect(payment).not.toHaveProperty('subscriptionId');
    expect(payment).not.toHaveProperty('isRenewal');
    expect(provider.createAutoRenewalPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: payment.id,
        amount: 8333,
        currency: 'RUB',
      }),
      'saved-method',
    );
    expect(payments.addExternalPaymentId).toHaveBeenCalledWith(
      payment.id,
      'external',
    );
    expect(state).toBe('Processing');
    await usecase.execute();
    expect(payments.create).toHaveBeenCalledTimes(1);
    expect(provider.createAutoRenewalPayment).toHaveBeenCalledTimes(1);
  });

  it.each([null, undefined])(
    'leaves Processing for the timeout when the method is %s',
    async (method) => {
      payments.findById.mockResolvedValue({ paymentMethodId: method });
      await usecase.execute();
      expect(state).toBe('Processing');
      expect(payments.create).not.toHaveBeenCalled();
      expect(provider.createAutoRenewalPayment).not.toHaveBeenCalled();
    },
  );

  it('leaves Processing when the previous payment does not exist', async () => {
    payments.findById.mockResolvedValue(undefined);
    await usecase.execute();
    expect(state).toBe('Processing');
    expect(payments.create).not.toHaveBeenCalled();
  });

  it('does not call the provider if persisting the pending payment fails', async () => {
    payments.create.mockRejectedValue(new Error('database unavailable'));
    await usecase.execute();
    expect(provider.createAutoRenewalPayment).not.toHaveBeenCalled();
    expect(state).toBe('Processing');
  });

  it('retains the pending attempt on a provider timeout without charging again on the next tick', async () => {
    provider.createAutoRenewalPayment.mockRejectedValue(new Error('timeout'));
    await usecase.execute();
    await usecase.execute();
    expect(state).toBe('Processing');
    expect(payments.create).toHaveBeenCalledTimes(1);
    expect(payments.addExternalPaymentId).not.toHaveBeenCalled();
  });

  it('continues processing other subscriptions after one fails', async () => {
    subscriptions.findDueForYookassa.mockResolvedValue([
      subscription,
      { ...subscription, id: 'second' },
    ]);
    payments.findById.mockRejectedValueOnce(new Error('unavailable'));
    await usecase.execute();
    expect(
      subscriptions.updateSubscriptionsStatusToProcessing,
    ).toHaveBeenCalledWith('second');
    expect(subscriptions.addPaymentIdToSubscriptions).toHaveBeenCalledWith(
      'second',
      payments.create.mock.calls[0][0].id,
    );
  });

  it('does not charge if linking the saved attempt fails', async () => {
    subscriptions.addPaymentIdToSubscriptions.mockRejectedValueOnce(
      new Error('unavailable'),
    );
    await usecase.execute();
    expect(payments.create).toHaveBeenCalledTimes(1);
    expect(provider.createAutoRenewalPayment).not.toHaveBeenCalled();
    expect(state).toBe('Processing');
  });
});
