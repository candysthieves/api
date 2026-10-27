import type { PaymentTariff } from '../../application/payments-tcp.service.js';
import { TariffViewType } from '@main/modules/payments/api/view-types/tariff-view.type.js';

export class TariffsMapper {
  static toView(tariff: PaymentTariff): TariffViewType {
    return {
      id: String(tariff.id),
      tariff_name: tariff.tariff_name,
      durationDays: tariff.durationDays,
      price: Number(tariff.price),
      currency: 'USD',
    };
  }

  static toViews(tariffs: PaymentTariff[]): TariffViewType[] {
    return tariffs.map((tariff): TariffViewType => this.toView(tariff));
  }
}
