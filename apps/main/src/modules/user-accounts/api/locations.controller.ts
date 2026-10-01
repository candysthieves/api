import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { GetCountriesQuery } from '../application/query-handler/locations/get-countries.query-handler.js';
import { GetCitiesQuery } from '../application/query-handler/locations/get-cities.query-handler.js';
import { GetCountryViewType } from './view-types/locations/get-country-view.type.js';
import { GetCityViewType } from './view-types/locations/get-city.view.type.js';
import { ApiGetCountries } from '../../../core/swagger/locations-dto/get-countries.swagger.js';
import { ApiGetCities } from '../../../core/swagger/locations-dto/get-cities.swagger.js';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('countries')
  @ApiGetCountries()
  getCountries(): Promise<GetCountryViewType[]> {
    return this.queryBus.execute<GetCountriesQuery, GetCountryViewType[]>(
      new GetCountriesQuery(),
    );
  }

  @Get('cities/:countryId')
  @ApiGetCities()
  getCities(@Param('countryId') countryId: string): Promise<GetCityViewType[]> {
    return this.queryBus.execute<GetCitiesQuery, GetCityViewType[]>(
      new GetCitiesQuery(+countryId),
    );
  }
}
