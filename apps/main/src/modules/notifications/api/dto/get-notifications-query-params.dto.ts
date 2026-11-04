import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetNotificationsQueryParamsDto {
  @ApiPropertyOptional({
    description: 'Number of notifications to return',
    default: 10,
    minimum: 1,
    maximum: 50,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 10;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description:
      'Cursor (createdAt ISO date) of the last notification from previous page',
    example: '2026-11-04T12:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string | null;
}
