import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../user-accounts/api/guards/access-token.guard.js';
import { User } from '../../user-accounts/api/decorators/user.decorator.js';
import type { JwtAccessPayload } from '../../../core/types/jwt-payload.type.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentViewType } from './view-types/payment-view.type.js';
import { CreatePaymentCommand } from '../application/use-cases/create-payment.usecase.js';
import { apiErrorResponseSchema } from '../../../core/exceptions/api-error-response.swagger.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: PaymentViewType })
  @ApiBadRequestResponse({
    description: 'Bad request or unsupported provider',
    schema: apiErrorResponseSchema,
  })
  @ApiNotFoundResponse({
    description: 'Tariff not found',
    schema: apiErrorResponseSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    schema: apiErrorResponseSchema,
  })
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
