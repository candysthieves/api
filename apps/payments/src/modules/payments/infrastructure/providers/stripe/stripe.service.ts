import { Injectable } from '@nestjs/common';
import {
  CreatePaymentParams,
  CreatePaymentResult,
  IPaymentProvider,
} from '../payment-provider.interface.js';
import Stripe from 'stripe';
import { PaymentsConfig } from '../../../../../payments.config.js';

@Injectable()
export class StripeService implements IPaymentProvider {
  private readonly stripe: Stripe;

  constructor(private readonly config: PaymentsConfig) {
    this.stripe = new Stripe(config.stripeSecretKey);
  }

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    await Promise.resolve(params);

    return {
      externalPaymentId: '',
      paymentUrl: '',
    };
  }
}
