import type { PaymentTariff } from '../../application/payments-tcp.service.js';
import { TariffViewType } from '@main/modules/payments/api/view-types/tariff-view.type.js';

export class TariffsMapper {
  static toView(tariff: PaymentTariff): TariffViewType {
    return {
      id: tariff.id,
      name: tariff.name,
      durationDays: tariff.durationDays,
      priceInMinorUnits: Number(tariff.priceInMinorUnits),
      currency: 'USD',
      priceUnit: 'CENT',
    };
  }

  static toViews(tariffs: PaymentTariff[]): TariffViewType[] {
    return tariffs.map((tariff): TariffViewType => this.toView(tariff));
  }
}
