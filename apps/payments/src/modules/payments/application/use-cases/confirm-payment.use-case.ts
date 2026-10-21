import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmPaymentContract } from '@libs/contracts/confirm-payment.contract.js';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { randomUUID } from 'node:crypto';

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

    // Идемпотентность: не обрабатываем повторно успешный платеж
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

    await this.subscriptionsRepository.create({
      id: randomUUID(),
      userId: dto.userId,
      tariffId: tariff.id,
      lastPaymentId: payment.id,
      expirationDate,
      cancellationRequestedAt: null,
    });
  }
}
