import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
import { ApiYookassaWebhook } from '../../../core/swagger/payments-dto/yookassa-webhook.swagger.js';
import { PaymentsTcpService } from '../application/payments-tcp.service.js';
import { YookassaWebhookDto } from './dto/yookassa-webhook.dto.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly paymentsTcpService: PaymentsTcpService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiCreatePayment()
  createPayment(
    @User() user: JwtAccessPayload,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentViewType> {
    return this.commandBus.execute<CreatePaymentCommand, PaymentViewType>(
      new CreatePaymentCommand(
        user.userId.toString(),
        dto.tariffId,
        dto.provider,
      ),
    );
  }

  @Post('yookassa/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiYookassaWebhook()
  async yookassaWebhook(
    @Body() payload: YookassaWebhookDto,
  ): Promise<{ accepted: true }> {
    await this.paymentsTcpService.processYookassaNotification(
      payload.object.id,
    );
    return { accepted: true };
  }
}
