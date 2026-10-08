import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { GetCountriesQuery } from '../../application/query-handler/locations/get-countries.query-handler.js';
import { GetCitiesQuery } from '../../application/query-handler/locations/get-cities.query-handler.js';
import { GetCountryViewType } from '../view-types/locations/get-country-view.type.js';
import { GetCityViewType } from '../view-types/locations/get-city.view.type.js';
import { ApiGetCountries } from '../../../../core/swagger/locations-dto/get-countries.swagger.js';
import { ApiGetCities } from '../../../../core/swagger/locations-dto/get-cities.swagger.js';
import { GetCountriesQueryParamsDto } from '../dto/locations/get-countries-query-params.dto.js';
import { GetCitiesQueryParamsDto } from '../dto/locations/get-cities-query-params.dto.js';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('countries')
  @ApiGetCountries()
  getCountries(
    @Query() query: GetCountriesQueryParamsDto,
  ): Promise<GetCountryViewType[]> {
    return this.queryBus.execute<GetCountriesQuery, GetCountryViewType[]>(
      new GetCountriesQuery(query.sortBy, query.sortDirection ?? 'ASC'),
    );
  }

  @Get('cities/:countryId')
  @ApiGetCities()
  getCities(
    @Param('countryId') countryId: string,
    @Query() query: GetCitiesQueryParamsDto,
  ): Promise<GetCityViewType[]> {
    return this.queryBus.execute<GetCitiesQuery, GetCityViewType[]>(
      new GetCitiesQuery(
        +countryId,
        query.sortBy,
        query.sortDirection ?? 'ASC',
      ),
    );
  }
}
