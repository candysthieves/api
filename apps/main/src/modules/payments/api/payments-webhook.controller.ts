import {
  Controller,
  HttpCode,
  Headers,
  HttpStatus,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { StripeWebhookCommand } from '../application/use-cases/stripe-webhook.usecase.js';

@Controller('payments/webhook')
export class PaymentsWebhookController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody ?? (req.body as Buffer | string);

    await this.commandBus.execute(new StripeWebhookCommand(rawBody, signature));

    return { received: true };
  }
}
