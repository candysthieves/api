import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  CreatePaymentParams,
  CreatePaymentResult,
  IPaymentProvider,
} from '../payment-provider.interface.js';
import Stripe from 'stripe';
import { PaymentsConfig } from '../../../../../payments.config.js';
import { ObjectResult } from '../../../../../core/object-result.js';

@Injectable()
export class StripeService implements IPaymentProvider {
  private readonly stripe: Stripe;

  constructor(private readonly config: PaymentsConfig) {
    this.stripe = new Stripe(config.stripeSecretKey);
  }

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    const frontendUrl: string = this.config.frontendUrl.replace(/\/+$/, '');

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          client_reference_id: params.paymentId,

          line_items: [
            {
              price_data: {
                currency: params.currency.toLowerCase(),
                unit_amount: Number(params.amount),

                product_data: {
                  name: params.description,
                },

                recurring: {
                  interval: 'day',
                  interval_count: Number(params.durationDays),
                },
              },

              quantity: 1,
            },
          ],

          metadata: {
            paymentId: params.paymentId,
          },

          subscription_data: {
            metadata: {
              paymentId: params.paymentId,
            },
          },

          success_url: `${frontendUrl}/payment/success?paymentId=${params.paymentId}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendUrl}/payment/cancel?paymentId=${params.paymentId}`,
        },
        {
          idempotencyKey: params.paymentId,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create Stripe checkout session';

      throw new RpcException(
        ObjectResult.failure({
          code: 'PAYMENT_CREATION_FAILED',
          errors: [
            {
              field: 'payment',
              message,
            },
          ],
        }),
      );
    }

    if (!session.url) {
      throw new RpcException(
        ObjectResult.failure({
          code: 'PAYMENT_CREATION_FAILED',
          errors: [
            {
              field: 'payment',
              message: 'Stripe checkout session URL was not generated',
            },
          ],
        }),
      );
    }

    return {
      externalPaymentId: session.id,
      paymentUrl: session.url,
    };
  }
}
