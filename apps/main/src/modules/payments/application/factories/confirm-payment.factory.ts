import { ConfirmPaymentContract } from '@libs/contracts/confirm-payment.contract.js';
import type Stripe from 'stripe';

export class ConfirmPaymentFactory {
  static createFromStripeSession(
    event: Stripe.Event,
    session: Stripe.Checkout.Session,
  ): ConfirmPaymentContract {
    return {
      provider: 'STRIPE',
      eventId: event.id,
      externalPaymentId: session.id,
      userId: session.metadata?.userId ?? session.client_reference_id ?? '',
      status: 'succeeded',
    };
  }
}
