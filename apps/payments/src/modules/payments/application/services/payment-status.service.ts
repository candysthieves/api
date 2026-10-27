import { Injectable, Logger } from '@nestjs/common';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { YookassaService } from '../../infrastructure/providers/yookassa/yookassa.service.js';
import { OutboxService } from '../../../../events/outbox/outbox.service.js';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import type { PaymentEntity } from '../../../../database/types/payment-database.type.js';

@Injectable()
export class PaymentStatusService {
  private readonly logger = new Logger(PaymentStatusService.name);

  // Подключает хранилища платежей и подписок, клиент Yookassa и outbox.
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly yookassaService: YookassaService,
    private readonly outboxService: OutboxService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly tariffsRepository: TariffsRepository,
  ) {}

  // Выбирает обработчик результата; для уже успешного платежа повторяет только локальные шаги.
  async process(externalPaymentId: string): Promise<void> {
    this.logger.log({
      message: 'Processing payment confirmation',
      externalPaymentId,
    });
    // Находим платёж
    const payment =
      await this.paymentsRepository.findByExternalPaymentId(externalPaymentId);
    if (!payment) {
      this.logger.warn({
        message: 'Payment not found for confirmation',
        externalPaymentId,
      });
      throw new Error('PAYMENT_NOT_FOUND');
    }

    this.logger.log({
      message: 'Local payment found',
      externalPaymentId,
      paymentId: payment.id,
      status: payment.status,
    });

    if (payment.status === 'succeeded') {
      return this.processSucceededPayment(payment);
    }
    //Достаем данные с Yookassa для конкретного платежа
    const updatedPayment = await this.syncPaymentStatus(
      payment,
      externalPaymentId,
    );
    if (!updatedPayment) return;

    //Если статус от Yookassa canceled -> запускаем протокол отмены для платёжки
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

  // Сохраняет финальный результат Yookassa
  private async syncPaymentStatus(
    payment: PaymentEntity,
    externalPaymentId: string,
  ): Promise<PaymentEntity | null> {
    const infoFromYookassa =
      await this.yookassaService.getPayment(externalPaymentId);
    if (
      infoFromYookassa.status !== 'succeeded' &&
      infoFromYookassa.status !== 'canceled'
    ) {
      this.logger.warn({
        message: 'Payment confirmation skipped: non-final YooKassa status',
        externalPaymentId,
        paymentId: payment.id,
        status: infoFromYookassa.status,
      });
      return null;
    }

    const paymentMethodId = infoFromYookassa.payment_method?.saved
      ? infoFromYookassa.payment_method.id
      : null;
    const paymentDate =
      infoFromYookassa.status === 'succeeded' ? new Date() : null;

    await this.paymentsRepository.updateStatus(
      payment.id,
      infoFromYookassa.status,
      paymentMethodId,
      paymentDate,
    );
    this.logger.log({
      message: 'Payment status persisted',
      externalPaymentId,
      paymentId: payment.id,
      status: infoFromYookassa.status,
    });

    return {
      ...payment,
      status: infoFromYookassa.status,
      paymentMethodId,
      paymentDate,
    };
  }

  // Завершает подписку перед записью события; оба шага можно повторить после сбоя.
  private async processSucceededPayment(payment: PaymentEntity): Promise<void> {
    this.logger.log({
      message: 'Completing subscription',
      paymentId: payment.id,
    });
    await this.completeSubscription(payment);
    this.logger.log({
      message: 'Subscription completed; saving payment.completed event',
      paymentId: payment.id,
    });
    await this.savePaymentCompletedEvent(payment);
    this.logger.log({
      message: 'payment.completed event persisted to outbox',
      paymentId: payment.id,
    });
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
    this.logger.log({
      message: 'Applying canceled payment to subscription',
      paymentId: payment.id,
    });
    const subscription = await this.subscriptionsRepository.findByLastPaymentId(
      payment.id,
    );
    if (!subscription) throw new Error('SUBSCRIPTION_NOT_FOUND');
    await this.subscriptionsRepository.fail(subscription.id);
    await this.outboxService.save({
      eventId: payment.id,
      consumer: 'MAIN',
      type: 'payment.canceled',
      data: { userId: payment.userId, paymentStatus: 'canceled' },
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
}
