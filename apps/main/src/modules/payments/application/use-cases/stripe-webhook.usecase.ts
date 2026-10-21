import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import Stripe from 'stripe';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AppConfig } from '@main/app.config.js';
import { DomainExceptions } from '@main/core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '@main/core/exceptions/domain-exception-code.js';
import { firstValueFrom } from 'rxjs';
import { PAYMENTS_TCP_SERVICE } from '../payments-tcp.service.js';
import { ConfirmPaymentFactory } from '../factories/confirm-payment.factory.js';

export class StripeWebhookCommand {
  constructor(
    public readonly rawBody: Buffer | string,
    public readonly signature: string,
  ) {}
}

@CommandHandler(StripeWebhookCommand)
export class StripeWebhookUseCase implements ICommandHandler<
  StripeWebhookCommand,
  void
> {
  private readonly stripe: Stripe;

  constructor(
    @Inject(PAYMENTS_TCP_SERVICE) private readonly paymentsClient: ClientProxy,
    private readonly config: AppConfig,
  ) {
    this.stripe = new Stripe(this.config.stripeSecretKey);
  }

  async execute({ rawBody, signature }: StripeWebhookCommand): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.stripeWebhookSecret,
      );
    } catch (err: unknown) {
      const message: string =
        err instanceof Error ? String(err.message) : 'Unknown error';
      DomainExceptions.badRequest(
        ErrorStatus.PAYMENT_CREATION_FAILED,
        'stripe-signature',
        `Webhook signature verification failed: ${message}`,
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const payload = ConfirmPaymentFactory.createFromStripeSession(
        event,
        session,
      );

      await firstValueFrom(
        this.paymentsClient.send({ cmd: 'confirm-payment' }, payload),
      );
    }
  }
}
