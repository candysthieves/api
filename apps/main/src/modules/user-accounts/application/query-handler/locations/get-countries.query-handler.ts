import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LocationsRepository } from '../../../infrastructure/repositories/locations-repositories/locations.repository.js';
import { LocationsMapper } from '../../../api/mappers/locations.mapper.js';
import { GetCountryViewType } from '../../../api/view-types/locations/get-country-view.type.js';

export class GetCountriesQuery {
  constructor(
    public readonly sortBy?: 'countryId' | 'countryNameRu' | 'countryNameEn',
    public readonly sortDirection?: 'ASC' | 'DESC',
  ) {}
}

@QueryHandler(GetCountriesQuery)
export class GetCountriesQueryHandler implements IQueryHandler<
  GetCountriesQuery,
  GetCountryViewType[]
> {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  async execute({
    sortBy,
    sortDirection,
  }: GetCountriesQuery): Promise<GetCountryViewType[]> {
    const countries = await this.locationsRepository.getCountries(
      sortBy,
      sortDirection?.toLowerCase() as 'asc' | 'desc' | undefined,
    );

    return LocationsMapper.toGetCountriesView(countries);
  }
}
