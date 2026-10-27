import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
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
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly commandBus: CommandBus) {}

  @Post('webhooks/yookassa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a YooKassa payment notification' })
  @ApiOkResponse({
    description:
      'Notification persisted for processing, or unrelated event ignored',
  })
  acceptYookassaWebhook(
    @Body() dto: YookassaWebhookDto,
    @Req() request: Request,
  ): Promise<void> {
    this.logger.log(
      `YooKassa webhook payload: ${JSON.stringify(request.body)}`,
    );
    return this.commandBus.execute(
      new AcceptYookassaWebhookCommand(dto.event, dto.object.id),
    );
  }

  @Post('test/yookassa/:paymentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simulate a successful YooKassa webhook for local testing',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment ID from YooKassa' })
  @ApiOkResponse({ description: 'Notification persisted for processing' })
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
