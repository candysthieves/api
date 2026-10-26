import { Injectable } from '@nestjs/common';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { YookassaService } from '../../infrastructure/providers/yookassa/yookassa.service.js';
import { OutboxService } from '../../../../events/outbox/outbox.service.js';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { TariffEntity } from '../../../../database/types/payment-database.type.js';

@Injectable()
export class PaymentStatusService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly yookassaService: YookassaService,
    private readonly outboxService: OutboxService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly tariffsRepository: TariffsRepository,
  ) {}

  async process(externalPaymentId: string): Promise<void> {
    const payment =
      await this.paymentsRepository.findByExternalPaymentId(externalPaymentId);
    if (!payment) throw new Error('PAYMENT_NOT_FOUND');
    if (payment.status === 'pending') {
      const current = await this.yookassaService.getPayment(externalPaymentId);
      if (current.status !== 'succeeded' && current.status !== 'canceled')
        return;
      const methodId = current.payment_method?.saved
        ? current.payment_method.id
        : null;
      await this.paymentsRepository.updateStatus(
        payment.id,
        current.status,
        methodId,
      );
      payment.status = current.status;
    }
    if (payment.status !== 'succeeded') return;
    //TODO посоветоваться, оставить 2 явных метода на создание и апдейт или объеденить их
    const tariff: TariffEntity = await this.tariffsRepository.findTariffById(
      payment.tariffId,
    );
    const subscription =
      await this.subscriptionsRepository.findSubscriptionByUserId(
        payment.userId,
      );
    if (subscription) {
      await this.subscriptionsRepository.updateSubscription(
        payment.userId,
        payment.tariffId,
        payment.id,
        tariff.durationDays,
      );
    } else {
      await this.subscriptionsRepository.saveSubscription(
        payment.userId,
        payment.tariffId,
        payment.id,
        tariff.durationDays,
      );
    }
    // Повтор после сохранения succeeded восстанавливает outbox без нового GET.
    await this.outboxService.save({
      eventId: payment.id,
      consumer: 'MAIN',
      type: 'payment.completed',
      data: { userId: payment.userId, paymentStatus: 'completed' },
    });
  }

  async cancelExpired(): Promise<void> {
    for (const payment of await this.paymentsRepository.findExpired()) {
      const current = await this.paymentsRepository.findByExternalPaymentId(
        payment.externalPaymentId,
      );
      if (current?.status === 'pending') {
        await this.paymentsRepository.updateStatus(
          current.id,
          'canceled',
          null,
        );
      }
    }
  }
}
