import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';


export class EnvironmentVariables {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3009;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  TCP_HOST?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  TCP_PORT?: number;

  @IsString()
  @IsNotEmpty()
  CLICKHOUSE_HOST!: string;

  @IsString()
  @IsNotEmpty()
  CLICKHOUSE_USER!: string;

  @IsString()
  CLICKHOUSE_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  CLICKHOUSE_DATABASE!: string;
}

