import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { YookassaService } from '../../infrastructure/providers/yookassa/yookassa.service.js';
import { PaymentFactory } from '../factories/payment.factory.js';
import { PaymentParamsFactory } from '../factories/payment-params.factory.js';
import { SubscriptionExpirationService } from '../services/subscription-expiration.service.js';
import type {
  SubscriptionEntity,
  TariffEntity,
} from '../../../../database/types/payment-database.type.js';

export class RenewSubscriptionsCommand {}

@CommandHandler(RenewSubscriptionsCommand)
export class RenewSubscriptionsUseCase implements ICommandHandler<
  RenewSubscriptionsCommand,
  void
> {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly tariffsRepository: TariffsRepository,
    private readonly yookassaService: YookassaService,
    private readonly subscriptionExpirationService: SubscriptionExpirationService,
  ) {}

  async execute(): Promise<void> {
    const subscriptions = await this.subscriptionsRepository.findDueForYookassa(
      new Date(),
    );
    for (const subscription of subscriptions) {
      try {
        if (
          subscription.status === 'Failed' ||
          subscription.nextChargeDate === null
        ) {
          await this.subscriptionExpirationService.expire(subscription.userId);
          continue;
        }
        await this.renewSubscription(subscription);
      } catch {
        // Continue processing other subscriptions; the failed one can be retried.
      }
    }
  }

  private async renewSubscription(
    subscription: SubscriptionEntity,
  ): Promise<void> {
    await this.subscriptionsRepository.updateSubscriptionsStatusToProcessing(
      subscription.id,
    );
    const paymentMethodId = await this.getPaymentMethodId(subscription);
    if (!paymentMethodId) return;

    const tariff = await this.tariffsRepository.findTariffById(
      subscription.tariffId,
    );
    const paymentId = await this.createRenewalPayment(
      subscription,
      tariff,
      paymentMethodId,
    );
    await this.chargeRenewalPayment(paymentId, tariff, paymentMethodId);
    // Final status is applied by the existing webhook/inbox flow.
  }

  private async getPaymentMethodId(
    subscription: SubscriptionEntity,
  ): Promise<string | null> {
    if (!subscription.lastPaymentId) return null;
    const previousPayment = await this.paymentsRepository.findById(
      subscription.lastPaymentId,
    );
    return previousPayment?.paymentMethodId ?? null;
  }

  private async createRenewalPayment(
    subscription: SubscriptionEntity,
    tariff: TariffEntity,
    paymentMethodId: string,
  ): Promise<string> {
    const paymentId = randomUUID();
    const payment = PaymentFactory.create(
      subscription.userId,
      subscription.tariffId,
      'YOOKASSA',
      null,
      Number(tariff.price),
      paymentId,
    );
    payment.paymentMethodId = paymentMethodId;
    await this.paymentsRepository.create(payment);
    await this.subscriptionsRepository.addPaymentIdToSubscriptions(
      subscription.id,
      payment.id,
    );
    return paymentId;
  }

  private async chargeRenewalPayment(
    paymentId: string,
    tariff: TariffEntity,
    paymentMethodId: string,
  ): Promise<void> {
    const result = await this.yookassaService.createAutoRenewalPayment(
      PaymentParamsFactory.create(paymentId, tariff, 'RUB'),
      paymentMethodId,
    );
    await this.paymentsRepository.addExternalPaymentId(paymentId, result.id);
  }
}
