import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
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

  @IsString()
  @IsNotEmpty()
  TCP_HOST!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  TCP_PORT!: number;

  @IsString()
  @IsNotEmpty()
  CLICKHOUSE_HOST!: string;

  @IsString()
  @IsNotEmpty()
  CLICKHOUSE_USER!: string;

  @IsString()
  @IsNotEmpty()
  CLICKHOUSE_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  CLICKHOUSE_DATABASE!: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_WEBHOOK_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL!: string;
}

