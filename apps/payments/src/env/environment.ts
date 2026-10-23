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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  SUBSCRIPTION_DURATION_MINUTES?: number;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_URL!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  RABBITMQ_PREFETCH_COUNT = 20;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_FILES_TO_MAIN_QUEUE!: string;

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

  @IsString()
  @IsNotEmpty()
  YOOKASSA_SHOP_ID!: string;

  @IsString()
  @IsNotEmpty()
  YOOKASSA_SECRET_KEY!: string;
}
