import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LocationsRepository } from '../../../infrastructure/repositories/locations-repositories/locations.repository.js';
import { LocationsMapper } from '../../../api/mappers/locations.mapper.js';
import { GetCountryViewType } from '../../../api/view-types/locations/get-country-view.type.js';

export class GetCountriesQuery {
  constructor() {}
}

@QueryHandler(GetCountriesQuery)
export class GetCountriesQueryHandler implements IQueryHandler<
  GetCountriesQuery,
  GetCountryViewType[]
> {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  async execute(): Promise<GetCountryViewType[]> {
    const countries = await this.locationsRepository.getCountries();

    return LocationsMapper.toGetCountriesView(countries);
  }
}
