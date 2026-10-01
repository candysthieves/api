import { City, Country } from '../../../../generated/prisma/client.js';
import { GetCountryViewType } from '../view-types/locations/get-country-view.type.js';
import { GetCityViewType } from '../view-types/locations/get-city.view.type.js';

export class LocationsMapper {
  static toGetCountryView(country: Country): GetCountryViewType {
    return {
      countryId: country.countryId,
      countryNameRu: country.countryNameRu,
      countryNameEn: country.countryNameEn,
    };
  }

  static toGetCountriesView(countries: Country[]): GetCountryViewType[] {
    return countries.map((country) => this.toGetCountryView(country));
  }

  static toGetCityView(city: City): GetCityViewType {
    return {
      countryId: city.countryId,
      cityId: city.cityId,
      cityNameRu: city.cityNameRu,
      cityNameEn: city.cityNameEn,
    };
  }

  static toGetCitiesView(cities: City[]): GetCityViewType[] {
    return cities.map((city) => this.toGetCityView(city));
  }
}
