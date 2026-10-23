import { TariffViewType } from '../view-types/tariff-view.type.js';
import type { TariffDbRow } from './types/tariff-db-row.type.js';

export class TariffsMapper {
  static toView(tariff: TariffDbRow): TariffViewType {
    return {
      id: tariff.id,
      tariff_name: tariff.name,
      durationDays: tariff.durationDays,
      priceInMinorUnits: tariff.priceInMinorUnits,
    };
  }

  static toViews(tariffs: TariffDbRow[]): TariffViewType[] {
    return tariffs.map((tariff) => this.toView(tariff));
  }
}
