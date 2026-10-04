import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LocationsRepository } from '../../../infrastructure/repositories/locations-repositories/locations.repository.js';
import { LocationsMapper } from '../../../api/mappers/locations.mapper.js';
import { GetCityViewType } from '../../../api/view-types/locations/get-city.view.type.js';

export class GetCitiesQuery {
  constructor(
    public readonly countryId: number,
    public readonly sortBy?: 'cityId' | 'cityNameRu' | 'cityNameEn',
    public readonly sortDirection?: 'ASC' | 'DESC',
  ) {}
}

@QueryHandler(GetCitiesQuery)
export class GetCitiesQueryHandler implements IQueryHandler<
  GetCitiesQuery,
  GetCityViewType[]
> {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  async execute({
    countryId,
    sortBy,
    sortDirection,
  }: GetCitiesQuery): Promise<GetCityViewType[]> {
    const cities = await this.locationsRepository.getCities(
      countryId,
      sortBy,
      sortDirection?.toLowerCase() as 'asc' | 'desc' | undefined,
    );

    return LocationsMapper.toGetCitiesView(cities);
  }
}
