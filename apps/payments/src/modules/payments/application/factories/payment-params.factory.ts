import type { TariffEntity } from '../../../../database/types/payment-database.type.js';
import type { CreatePaymentParams } from '../../infrastructure/providers/payment-provider.interface.js';

export const USD_PER_RUB = 0.012;

export class PaymentParamsFactory {
  static create(
    paymentId: string,
    tariff: TariffEntity,
    currency = 'USD',
  ): CreatePaymentParams {
    return {
      paymentId,
      amount:
        currency === 'RUB'
          ? Math.round(Number(tariff.priceInMinorUnits) / USD_PER_RUB)
          : Number(tariff.priceInMinorUnits),
      currency,
      description: `Subscription "${tariff.name}" for ${tariff.durationDays} day(s)`,
      durationDays: tariff.durationDays,
    };
  }
}
