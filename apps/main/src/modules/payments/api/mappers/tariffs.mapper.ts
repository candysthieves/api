import type { PaymentTariff } from '../../application/types/payment-tariff.type.js';
import { TariffViewType } from '@main/modules/payments/api/view-types/tariff-view.type.js';

export class TariffsMapper {
  static toView(tariff: PaymentTariff): TariffViewType {
    return {
      id: tariff.id,
      tariff_name: tariff.tariff_name,
      durationDays: tariff.durationDays,
      priceInMinorUnits: Number(tariff.priceInMinorUnits),
      currency: 'USD',
    };
  }

  static toViews(tariffs: PaymentTariff[]): TariffViewType[] {
    return tariffs.map((tariff): TariffViewType => this.toView(tariff));
  }
}
