import { TariffViewType } from './tariff-view.type.js';
import type { PaymentTariff } from '../application/payments-tcp.service.js';

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
    return tariffs.map((tariff) => this.toView(tariff));
  }
}
