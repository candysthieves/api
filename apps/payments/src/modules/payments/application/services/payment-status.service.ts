import { Injectable } from '@nestjs/common';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { YookassaService } from '../../infrastructure/providers/yookassa/yookassa.service.js';
import { OutboxService } from '../../../../events/outbox/outbox.service.js';

@Injectable()
export class PaymentStatusService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly yookassaService: YookassaService,
    private readonly outboxService: OutboxService,
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
