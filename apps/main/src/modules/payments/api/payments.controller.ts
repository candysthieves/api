import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../user-accounts/api/guards/access-token.guard.js';
import { User } from '../../user-accounts/api/decorators/user.decorator.js';
import type { JwtAccessPayload } from '../../../core/types/jwt-payload.type.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentViewType } from './view-types/payment-view.type.js';
import { CreatePaymentCommand } from '../application/use-cases/create-payment.usecase.js';
import { ApiCreatePayment } from '../../../core/swagger/payments-dto/create-payment.swagger.js';
import { ApiAcceptYookassaWebhook } from '../../../core/swagger/payments-dto/accept-yookassa-webhook.swagger.js';
import { ApiSimulateYookassaWebhook } from '../../../core/swagger/payments-dto/simulate-yookassa-webhook.swagger.js';
import { YookassaWebhookDto } from './dto/yookassa-webhook.dto.js';
import { AcceptYookassaWebhookCommand } from '../application/use-cases/accept-yookassa-webhook.usecase.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('webhooks/yookassa')
  @HttpCode(HttpStatus.OK)
  @ApiAcceptYookassaWebhook()
  acceptYookassaWebhook(@Body() dto: YookassaWebhookDto): Promise<void> {
    return this.commandBus.execute(
      new AcceptYookassaWebhookCommand(dto.event, dto.object.id),
    );
  }

  @Post('test/yookassa/:paymentId')
  @HttpCode(HttpStatus.OK)
  @ApiSimulateYookassaWebhook()
  simulateYookassaWebhook(
    @Param('paymentId') paymentId: string,
  ): Promise<void> {
    return this.commandBus.execute(
      new AcceptYookassaWebhookCommand('payment.succeeded', paymentId),
    );
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiCreatePayment()
  createPayment(
    @User() user: JwtAccessPayload,
    @Body() body: CreatePaymentDto,
  ): Promise<PaymentViewType> {
    return this.commandBus.execute<CreatePaymentCommand, PaymentViewType>(
      new CreatePaymentCommand(
        user.userId.toString(),
        body.tariffId,
        body.provider,
      ),
    );
  }
}
