import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  CountrySortField,
  LocationSortDirection,
} from './locations-sort.dto.js';

export class GetCountriesQueryParamsDto {
  @ApiPropertyOptional({
    enum: CountrySortField,
    description: 'Field used to sort countries',
  })
  @IsOptional()
  @IsEnum(CountrySortField)
  sortBy?: CountrySortField;

  @ApiPropertyOptional({
    enum: LocationSortDirection,
    default: LocationSortDirection.ASC,
    description: 'Sort direction',
  })
  @IsOptional()
  @IsEnum(LocationSortDirection)
  sortDirection?: LocationSortDirection;
}
