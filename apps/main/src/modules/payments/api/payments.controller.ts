import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../user-accounts/api/guards/access-token.guard.js';
import { User } from '../../user-accounts/api/decorators/user.decorator.js';
import type { JwtAccessPayload } from '../../../core/types/jwt-payload.type.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentViewType } from './view-types/payment-view.type.js';
import { CreatePaymentCommand } from '../application/use-cases/create-payment.usecase.js';
import { ApiCreatePayment } from '../../../core/swagger/payments-dto/create-payment.swagger.js';
import { YookassaWebhookDto } from './dto/yookassa-webhook.dto.js';
import { AcceptYookassaWebhookCommand } from '../application/use-cases/accept-yookassa-webhook.usecase.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('webhooks/yookassa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a YooKassa payment notification' })
  @ApiOkResponse({
    description:
      'Notification persisted for processing, or unrelated event ignored',
  })
  acceptYookassaWebhook(@Body() dto: YookassaWebhookDto): Promise<void> {
    return this.commandBus.execute(
      new AcceptYookassaWebhookCommand(dto.event, dto.object.id),
    );
  }

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
}
