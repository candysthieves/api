import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { StripeService } from './stripe/stripe.service.js';
import { YookassaService } from './yookassa/yookassa.service.js';
import { PaymentProvider } from '../../../../database/types/payment-database.type.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { IPaymentProvider } from './payment-provider.interface.js';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly stripeService: StripeService,
    private readonly yookassaService: YookassaService,
  ) {}

  getProvider(provider: PaymentProvider): IPaymentProvider {
    switch (provider.toUpperCase()) {
      case 'STRIPE':
        return this.stripeService;
      case 'YOOKASSA':
        return this.yookassaService;
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
