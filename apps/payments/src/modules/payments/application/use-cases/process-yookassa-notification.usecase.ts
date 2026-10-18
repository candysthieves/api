import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import {
  USD_TO_RUB_RATE,
  YookassaService,
} from '../../infrastructure/providers/yookassa/yookassa.service.js';

export class ProcessYookassaNotificationCommand {
  constructor(public readonly providerPaymentId: string) {}
}

@CommandHandler(ProcessYookassaNotificationCommand)
export class ProcessYookassaNotificationUseCase implements ICommandHandler<
  ProcessYookassaNotificationCommand,
  void
> {
  private readonly inFlight = new Set<string>();
  private readonly logger = new Logger(ProcessYookassaNotificationUseCase.name);

  constructor(
    private readonly payments: PaymentsRepository,
    private readonly tariffs: TariffsRepository,
    private readonly subscriptions: SubscriptionsRepository,
    private readonly yookassa: YookassaService,
  ) {}

  async execute({
    providerPaymentId,
  }: ProcessYookassaNotificationCommand): Promise<void> {
    if (this.inFlight.has(providerPaymentId)) return;
    this.inFlight.add(providerPaymentId);
    try {
      await this.process(providerPaymentId);
    } finally {
      this.inFlight.delete(providerPaymentId);
    }
  }

  private async process(providerPaymentId: string): Promise<void> {
    const providerPayment =
      await this.yookassa.getPaymentByProviderId(providerPaymentId);
    if (providerPayment.id !== providerPaymentId) return;
    const metadataPaymentId = providerPayment.metadata?.paymentId;
    const payment =
      (await this.payments.findByProviderPaymentId(providerPaymentId)) ??
      (metadataPaymentId
        ? await this.payments.findById(metadataPaymentId)
        : undefined);
    if (
      !payment ||
      payment.provider !== 'YOOKASSA' ||
      metadataPaymentId !== payment.id
    ) {
      return;
    }
    if (payment.status === 'succeeded') return;
    if (providerPayment.status !== 'succeeded' || !providerPayment.paid) return;

    const tariff = await this.tariffs.findTariffById(payment.tariffId);
    const expectedUsdMinor = Number(
      payment.amountMinorUnits ?? tariff.priceInMinorUnits,
    );
    const expectedMinor = Math.round(expectedUsdMinor * USD_TO_RUB_RATE);
    const expectedCurrency = 'RUB';
    const actualMinor = Math.round(
      Number(providerPayment.amount.value) *
        (providerPayment.amount.currency === 'JPY' ? 1 : 100),
    );
    if (
      actualMinor !== expectedMinor ||
      providerPayment.amount.currency !== expectedCurrency
    ) {
      this.logger.error(
        `Payment amount mismatch for ${providerPaymentId}: expected ${expectedMinor} minor units ${expectedCurrency}, received ${actualMinor} minor units ${providerPayment.amount.currency}`,
      );
      return;
    }

    const methodId = providerPayment.payment_method?.id;
    if (!methodId || providerPayment.payment_method?.saved !== true) {
      throw new Error('YooKassa did not return a saved payment method');
    }
    const paidAt = new Date(
      providerPayment.captured_at ?? providerPayment.created_at ?? Date.now(),
    );
    const expirationDate = new Date(
      paidAt.getTime() + tariff.durationDays * 86_400_000,
    );
    await this.subscriptions.activateFromSuccessfulPayment({
      userId: payment.userExternalPaymentId,
      tariffId: payment.tariffId,
      paymentId: payment.id,
      paymentMethodId: methodId,
      expirationDate,
      nextChargeDate: expirationDate,
    });
    await this.payments.setProviderPaymentId(payment.id, providerPaymentId);
    await this.payments.confirmPayment(payment.id, paidAt);
  }
}
