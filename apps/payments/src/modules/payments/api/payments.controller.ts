import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreatePaymentContract } from '@libs/contracts';
import { CreatePaymentCommand } from '../application/use-cases/create-payment.use-case.js';
import { PaymentViewType } from './view-types/payment-view.type.js';
import { ObjectResult } from '../../../core/object-result.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly commandBus: CommandBus) {}

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
}

