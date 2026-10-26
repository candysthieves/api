import { TariffViewType } from '../view-types/tariff-view.type.js';

type TariffDbRow = {
  id: number;
  name: string;
  durationDays: number;
  price: string;
};

export class TariffsMapper {
  static toView(tariff: TariffDbRow): TariffViewType {
    return {
      id: tariff.id,
      tariff_name: tariff.name,
      durationDays: tariff.durationDays,
      price: tariff.price,
    };
  }

  static toViews(tariffs: TariffDbRow[]): TariffViewType[] {
    return tariffs.map((tariff) => this.toView(tariff));
  }
}
