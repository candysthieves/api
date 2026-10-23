import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PaymentFactory } from '../factories/payment.factory.js';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { PaymentEventsRepository } from '../../infrastructure/repositories/payment-events.repository.js';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { SubscriptionsQueryRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.query.repository.js';
import type { SubscriptionEntity } from '../../../../database/types/payment-database.type.js';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { YookassaService } from '../../infrastructure/providers/yookassa/yookassa.service.js';
import type { YookassaPayment } from '../../infrastructure/providers/payment-provider.interface.js';
import { PaymentParamsFactory } from '../factories/payment-params.factory.js';
import { SubscriptionRenewalFactory } from '../factories/subscription-renewal.factory.js';

// МЕРЗОСТЬ ДЛЯ АВТО ПРОДЛЕНИЯ ПОДПИСОК

// Запускает обработку подписок, срок списания которых наступил к указанному времени.
export class ProcessDueSubscriptionsCommand {
  constructor(public readonly at: Date) {}
}

// Создаёт повторяемый UUID для одной попытки продления подписки.
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

// Приводит дату списания к строке для формирования ключа попытки.
function dateKey(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

// Находит подписки с наступившей датой списания и продлевает их через YooKassa.
// TODO: Обсудить со старшим разработчиком, как упростить этот сценарий.
@CommandHandler(ProcessDueSubscriptionsCommand)
export class ProcessDueSubscriptionsUseCase implements ICommandHandler<
  ProcessDueSubscriptionsCommand,
  void
> {
  constructor(
    private readonly subscriptions: SubscriptionsRepository,
    private readonly subscriptionsQuery: SubscriptionsQueryRepository,
    private readonly payments: PaymentsRepository,
    private readonly paymentEvents: PaymentEventsRepository,
    private readonly tariffs: TariffsRepository,
    private readonly yookassa: YookassaService,
    private readonly configService: ConfigService,
  ) {}

  // Обрабатывает ограниченную пачку подписок, для которых наступил срок списания.
  async execute({ at }: ProcessDueSubscriptionsCommand): Promise<void> {
    // Обрабатывает подписки, срок списания по которым уже наступил.
    const due = await this.subscriptionsQuery.findDueForRenewal(at, 10);
    for (const subscription of due) await this.process(subscription, at);
  }

  // Выполняет или восстанавливает одну попытку списания и сохраняет её результат.
  private async process(subscription: SubscriptionEntity, at: Date) {
    if (!subscription.nextChargeDate || !subscription.paymentMethodId) return;
    const current = await this.subscriptionsQuery.findById(subscription.id);
    if (!current || current.cancellationRequestedAt) return;

    const attemptKey = stableUuid(
      `${subscription.id}:${dateKey(subscription.nextChargeDate)}`,
    );
    const tariff = await this.tariffs.findTariffById(subscription.tariffId);
    const payment = {
      ...PaymentFactory.create(
        subscription.userId,
        subscription.tariffId,
        'YOOKASSA',
        'pending',
        tariff.priceInMinorUnits,
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
    // При повторном запуске проверяет уже созданный платёж, чтобы не списать повторно.
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

    await this.payments.setProviderPaymentId(payment.id, providerPayment.id);
    if (providerPayment.status === 'succeeded' && providerPayment.paid) {
      const paidAt = new Date(
        providerPayment.captured_at ?? providerPayment.created_at ?? at,
      );
      await this.payments.confirmPayment(payment.id, paidAt);
      await this.paymentEvents.enqueueStatus(payment.id, 'succeeded');
      const expirationDate = SubscriptionRenewalFactory.nextChargeAt(
        paidAt,
        tariff.durationDays,
        this.configService.get<number>('SUBSCRIPTION_DURATION_MINUTES'),
      );
      await this.subscriptions.markRenewalSucceeded(
        subscription.id,
        payment.id,
        expirationDate,
      );
      return;
    }

    if (providerPayment.status !== 'canceled') return;

    await this.payments.failPayment(payment.id);
    await this.subscriptions.markRenewalFailed(subscription.id);
    await this.paymentEvents.enqueueStatus(payment.id, 'failed');
  }
}
