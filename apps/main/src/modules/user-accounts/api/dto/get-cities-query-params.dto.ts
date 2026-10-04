import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  CitySortField,
  LocationSortDirection,
} from './locations-sort.dto.js';

export class GetCitiesQueryParamsDto {
  @ApiPropertyOptional({
    enum: CitySortField,
    description: 'Field used to sort cities',
  })
  @IsOptional()
  @IsEnum(CitySortField)
  sortBy?: CitySortField;

  @ApiPropertyOptional({
    enum: LocationSortDirection,
    default: LocationSortDirection.ASC,
    description: 'Sort direction',
  })
  @IsOptional()
  @IsEnum(LocationSortDirection)
  sortDirection?: LocationSortDirection;
}
