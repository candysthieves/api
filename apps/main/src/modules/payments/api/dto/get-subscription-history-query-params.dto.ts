import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetSubscriptionHistoryQueryParamsDto {
  @ApiPropertyOptional({
    description: 'Page number, starting from 1',
    default: 1,
    minimum: 1,
    maximum: Math.floor(Number.MAX_SAFE_INTEGER / 20),
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Math.floor(Number.MAX_SAFE_INTEGER / 20))
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of payments to return',
    default: 10,
    minimum: 1,
    maximum: 20,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize: number = 10;
}
