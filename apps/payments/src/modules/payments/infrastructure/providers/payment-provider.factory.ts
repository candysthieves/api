import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { StripeService } from './stripe/stripe.service.js';
import { YookassaService } from './yookassa/yookassa.service.js';
import { PaymentProvider } from '../../../../database/types/payment-database.type.js';
import { ObjectResult } from '../../../../core/object-result.js';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly stripeService: StripeService,
    private readonly yooKassaService: YookassaService,
  ) {}

  getProvider(provider: PaymentProvider) {
    switch (provider.toUpperCase()) {
      case 'STRIPE':
        return this.stripeService;
      case 'YOOKASSA':
        return this.yooKassaService;
      default:
        throw new RpcException(
          ObjectResult.failure({
            code: 'UNSUPPORTED_PAYMENT_PROVIDER',
            errors: [
              {
                field: 'provider',
                message: `Payment provider '${String(provider)}' is not supported`,
              },
            ],
          }),
        );
    }
  }
}
