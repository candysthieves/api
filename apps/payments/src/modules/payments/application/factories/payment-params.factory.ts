import type { TariffEntity } from '../../../../database/types/payment-database.type.js';
import type { CreatePaymentParams } from '../../infrastructure/providers/payment-provider.interface.js';

export class PaymentParamsFactory {
  static create(
    paymentId: string,
    tariff: TariffEntity,
    currency = 'USD',
  ): CreatePaymentParams {
    return {
      paymentId,
      amount: tariff.priceInMinorUnits,
      currency,
      description: `Subscription "${tariff.name}" for ${tariff.durationDays} day(s)`,
    };
  }
}
