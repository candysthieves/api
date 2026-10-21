import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmPaymentContract } from '@libs/contracts/confirm-payment.contract.js';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { SubscriptionFactory } from '../factories/subscription.factory.js';

export class ConfirmPaymentCommand {
  constructor(public readonly dto: ConfirmPaymentContract) {}
}

@CommandHandler(ConfirmPaymentCommand)
export class ConfirmPaymentUseCase implements ICommandHandler<
  ConfirmPaymentCommand,
  void
> {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly tariffsRepository: TariffsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  async execute({ dto }: ConfirmPaymentCommand): Promise<void> {
    const payment = await this.paymentsRepository.findByExternalPaymentId(
      dto.externalPaymentId,
    );

    if (!payment) {
      return;
    }

    if (payment.status === 'succeeded') {
      return;
    }

    const now = new Date();

    await this.paymentsRepository.updateStatus(payment.id, 'succeeded', now);

    const tariff = await this.tariffsRepository.findTariffById(
      payment.tariffId,
    );

    const activeSubscription =
      await this.subscriptionsRepository.findActiveSubscription(
        dto.userId,
        now,
      );

    const baseDate = activeSubscription
      ? new Date(activeSubscription.expirationDate)
      : now;

    const expirationDate = new Date(baseDate);
    expirationDate.setDate(expirationDate.getDate() + tariff.durationDays);

    const subscription = SubscriptionFactory.create(
      dto.userId,
      tariff.id,
      payment.id,
      expirationDate,
    );

    await this.subscriptionsRepository.create(subscription);
  }
}
