import { createHash } from 'node:crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PaymentFactory } from '../factories/payment.factory.js';
import { SubscriptionRenewalFactory } from '../factories/subscription-renewal.factory.js';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { SubscriptionNotificationsRepository } from '../../infrastructure/repositories/subscription-notifications/subscription-notifications.repository.js';
import { YookassaService } from '../../infrastructure/providers/yookassa/yookassa.service.js';
import type { YookassaPayment } from '../../infrastructure/providers/payment-provider.interface.js';
import { PaymentParamsFactory } from '../factories/payment-params.factory.js';

export class ProcessDueSubscriptionsCommand {
  constructor(public readonly at: Date) {}
}

function stableUuid(value: string): string {
  const hex = createHash('sha256')
    .update(value)
    .digest('hex')
    .slice(0, 32)
    .split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const result = hex.join('');
  return `${result.slice(0, 8)}-${result.slice(8, 12)}-${result.slice(12, 16)}-${result.slice(16, 20)}-${result.slice(20)}`;
}

@CommandHandler(ProcessDueSubscriptionsCommand)
export class ProcessDueSubscriptionsUseCase implements ICommandHandler<
  ProcessDueSubscriptionsCommand,
  void
> {
  constructor(
    private readonly subscriptions: SubscriptionsRepository,
    private readonly payments: PaymentsRepository,
    private readonly tariffs: TariffsRepository,
    private readonly notifications: SubscriptionNotificationsRepository,
    private readonly yookassa: YookassaService,
  ) {}

  async execute({ at }: ProcessDueSubscriptionsCommand): Promise<void> {
    const due = await this.subscriptions.findDueForRenewal(at, 10);
    for (const subscription of due) await this.process(subscription, at);
  }

  private async process(
    subscription: Awaited<
      ReturnType<SubscriptionsRepository['findDueForRenewal']>
    >[number],
    at: Date,
  ) {
    if (!subscription.nextChargeDate || !subscription.paymentMethodId) return;
    const attemptKey = stableUuid(
      `${subscription.id}:${subscription.nextChargeDate.toISOString()}:${subscription.retryCount}`,
    );
    if (
      !(await this.subscriptions.prepareRenewalAttempt(
        subscription.id,
        attemptKey,
      ))
    )
      return;
    const latest = await this.subscriptions.findById(subscription.id);
    if (!latest || latest.cancellationRequestedAt) return;
    const tariff = await this.tariffs.findTariffById(subscription.tariffId);
    const payment = {
      ...PaymentFactory.create(
        subscription.userId,
        subscription.tariffId,
        'YOOKASSA',
        'pending',
        tariff.priceInMinorUnits,
        'USD',
      ),
      id: attemptKey,
      providerPaymentId: null,
    };
    const existingPayment = await this.payments.findById(payment.id);
    if (!existingPayment) {
      await this.payments.create(payment);
    }
    const params = PaymentParamsFactory.create(payment.id, tariff);
    let providerPayment: YookassaPayment;
    try {
      if (existingPayment?.providerPaymentId) {
        providerPayment = await this.yookassa.getPaymentByProviderId(
          existingPayment.providerPaymentId,
        );
      } else {
        providerPayment = await this.yookassa.chargeSavedPaymentMethod({
          paymentMethodId: subscription.paymentMethodId,
          amount: params.amount,
          currency: params.currency,
          description: params.description,
          idempotencyKey: attemptKey,
        });
      }
    } catch {
      // Network ambiguity is not a decline: keep the same key and retry next tick.
      return;
    }

    await this.payments.setProviderPaymentId(payment.id, providerPayment.id);
    if (providerPayment.status === 'succeeded' && providerPayment.paid) {
      const paidAt = new Date(
        providerPayment.captured_at ?? providerPayment.created_at ?? at,
      );
      await this.payments.confirmPayment(payment.id, paidAt);
      await this.subscriptions.markRenewalSucceeded(
        subscription.id,
        payment.id,
        paidAt,
        tariff.durationDays,
      );
      return;
    }

    if (providerPayment.status !== 'canceled') return;

    await this.payments.failPayment(payment.id);
    if (subscription.retryCount === 0) {
      const retryAt = SubscriptionRenewalFactory.retryAt(at);
      await this.notifications.createPending({
        id: stableUuid(
          `${subscription.id}:RENEWAL_RETRY_SCHEDULED:${attemptKey}`,
        ),
        userId: subscription.userId,
        kind: 'RENEWAL_RETRY_SCHEDULED',
      });
      await this.subscriptions.scheduleRetry(
        subscription.id,
        retryAt,
        stableUuid(`${subscription.id}:retry:${retryAt.toISOString()}`),
      );
      return;
    }

    await this.notifications.createPending({
      id: stableUuid(
        `${subscription.id}:SUBSCRIPTION_ENDED_AFTER_RETRY:${attemptKey}`,
      ),
      userId: subscription.userId,
      kind: 'SUBSCRIPTION_ENDED_AFTER_RETRY',
    });
    await this.subscriptions.endAfterFailedRetry(subscription.id, at);
  }
}
