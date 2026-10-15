import { TariffViewType } from '../view-types/tariff-view.type.js';

type TariffDbRow = {
  id: string;
  name: string;
  durationDays: number;
  priceInMinorUnits: string;
};

export class TariffsMapper {
  static toView(tariff: TariffDbRow): TariffViewType {
    return {
      id: tariff.id,
      name: tariff.name,
      durationDays: tariff.durationDays,
      priceInMinorUnits: tariff.priceInMinorUnits,
    };
  }

  static toViews(tariffs: TariffDbRow[]): TariffViewType[] {
    return tariffs.map((tariff) => this.toView(tariff));
  }
}
