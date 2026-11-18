import { Injectable } from '@nestjs/common';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { PaymentProviderFactory } from '../../infrastructure/providers/payment-provider.factory.js';
import { OutboxService } from '../../../../events/outbox/outbox.service.js';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import type { PaymentEntity } from '../../../../database/types/payment-database.type.js';
import { SubscriptionExpirationService } from './subscription-expiration.service.js';
import { paymentNotificationEventId } from './payment-notification-event-id.js';

@Injectable()
export class PaymentStatusService {
  // Подключает хранилища платежей и подписок, фабрику провайдеров и outbox.
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentProviderFactory: PaymentProviderFactory,
    private readonly outboxService: OutboxService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly tariffsRepository: TariffsRepository,
    private readonly subscriptionExpirationService: SubscriptionExpirationService,
  ) {}

  // Выбирает обработчик результата; для уже успешного платежа повторяет только локальные шаги.
  async process(externalPaymentId: string): Promise<void> {
    // Находим платёж
    const payment =
      await this.paymentsRepository.findByExternalPaymentId(externalPaymentId);
    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    if (payment.status === 'succeeded') {
      return this.processSucceededPayment(payment);
    }
    // Синхронизируем статус платежа с провайдером
    const updatedPayment = await this.syncPaymentStatus(
      payment,
      externalPaymentId,
    );
    if (!updatedPayment) return;

    // Если статус canceled -> запускаем протокол отмены для платёжки
    if (updatedPayment.status === 'canceled') {
      return this.processCanceledPayment(updatedPayment);
    }
    return this.processSucceededPayment(updatedPayment);
  }

  // Отменяет локальные платежи, для которых истёк срок ожидания оплаты.
  async cancelExpired(): Promise<void> {
    for (const payment of await this.paymentsRepository.findExpired()) {
      await this.paymentsRepository.updateStatus(
        payment.id,
        'canceled',
        null,
        null,
      );
    }
  }

  // Сохраняет финальный результат провайдера платежей
  private async syncPaymentStatus(
    payment: PaymentEntity,
    externalPaymentId: string,
  ): Promise<PaymentEntity | null> {
    const provider = this.paymentProviderFactory.getProvider(payment.provider);
    const info = await provider.getPayment(externalPaymentId);
    if (info.status !== 'succeeded' && info.status !== 'canceled') {
      return null;
    }

    const paymentMethodId = info.paymentMethodId;
    const paymentDate = info.status === 'succeeded' ? new Date() : null;

    await this.paymentsRepository.updateStatus(
      payment.id,
      info.status,
      paymentMethodId,
      paymentDate,
    );

    return {
      ...payment,
      status: info.status,
      paymentMethodId,
      paymentDate,
    };
  }

  // Завершает подписку перед записью события; оба шага можно повторить после сбоя.
  private async processSucceededPayment(payment: PaymentEntity): Promise<void> {
    await this.completeSubscription(payment);
    await this.savePaymentCompletedEvent(payment);
    await this.savePaymentNotificationEvent(payment);
  }

  // Продлевает связанную подписку, если она ещё не завершена, используя сохранённую дату оплаты.
  private async completeSubscription(payment: PaymentEntity): Promise<void> {
    const subscription = await this.subscriptionsRepository.findByLastPaymentId(
      payment.id,
    );
    if (!subscription) throw new Error('SUBSCRIPTION_NOT_FOUND');
    if (subscription.status === 'Done') return;

    const tariff = await this.tariffsRepository.findTariffById(
      payment.tariffId,
    );
    await this.subscriptionsRepository.complete(
      subscription.id,
      payment.id,
      tariff.durationDays,
      payment.paymentDate ?? new Date(),
    );
  }

  // Переводит подписку отменённого платежа в Failed.
  private async processCanceledPayment(payment: PaymentEntity): Promise<void> {
    const subscription = await this.subscriptionsRepository.findByLastPaymentId(
      payment.id,
    );
    if (!subscription) throw new Error('SUBSCRIPTION_NOT_FOUND');
    await this.subscriptionExpirationService.fail(subscription);
    await this.outboxService.save({
      eventId: payment.id,
      consumer: 'MAIN',
      type: 'payment.canceled',
      data: { userId: payment.userId, paymentStatus: 'canceled' },
    });
    await this.outboxService.save({
      eventId: paymentNotificationEventId(payment.id),
      consumer: 'NOTIFICATIONS',
      type: 'payment.canceled',
      data: { userId: payment.userId, paymentId: payment.id },
    });
  }

  // Сохраняет событие успешной оплаты для main с постоянным eventId для повторных попыток.
  private async savePaymentCompletedEvent(
    payment: PaymentEntity,
  ): Promise<void> {
    await this.outboxService.save({
      eventId: payment.id,
      consumer: 'MAIN',
      type: 'payment.completed',
      data: { userId: payment.userId, paymentStatus: 'completed' },
    });
  }

  // Сохраняет событие успешной оплаты для notifications с датами подписки.
  private async savePaymentNotificationEvent(
    payment: PaymentEntity,
  ): Promise<void> {
    const subscription = await this.subscriptionsRepository.findByLastPaymentId(
      payment.id,
    );
    if (!subscription) return;

    await this.outboxService.save({
      eventId: paymentNotificationEventId(payment.id),
      consumer: 'NOTIFICATIONS',
      type: 'payment.completed',
      data: {
        userId: payment.userId,
        paymentId: payment.id,
        subscriptionId: subscription.id,
        paidAt: new Date(payment.paymentDate ?? Date.now()).toISOString(),
        expirationDate: new Date(
          subscription.expirationDate ?? Date.now(),
        ).toISOString(),
        nextChargeDate: subscription.nextChargeDate
          ? new Date(subscription.nextChargeDate).toISOString()
          : null,
      },
    });
  }
}
