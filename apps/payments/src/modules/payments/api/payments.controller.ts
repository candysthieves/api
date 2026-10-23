import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreatePaymentContract } from '@libs/contracts';
import { CreatePaymentCommand } from '../application/use-cases/create-payment.use-case.js';
import { PaymentViewType } from './view-types/payment-view.type.js';
import { ObjectResult } from '../../../core/object-result.js';
import { PaymentEventsRepository } from '../infrastructure/repositories/payment-events.repository.js';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly paymentEvents: PaymentEventsRepository,
  ) {}

  @MessagePattern({ cmd: 'create-payment' })
  async createPayment(
    @Payload() dto: CreatePaymentContract,
  ): Promise<ObjectResult<PaymentViewType>> {
    const payment = await this.commandBus.execute<
      CreatePaymentCommand,
      PaymentViewType
    >(new CreatePaymentCommand(dto.userId, dto.tariffId, dto.provider));

    return ObjectResult.success(payment);
  }

  @MessagePattern({ cmd: 'process-yookassa-notification' })
  async processYookassaNotification(
    @Payload() payload: { eventId: string; providerPaymentId: string },
  ): Promise<ObjectResult<null>> {
    await this.paymentEvents.acceptNotification({
      eventId: payload.eventId,
      consumer: 'PAYMENTS',
      type: 'yookassa.notification.received',
      data: { providerPaymentId: payload.providerPaymentId },
    });
    return ObjectResult.success(null);
  }
}
