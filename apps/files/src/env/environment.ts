import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class EnvironmentVariables {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  TCP_PORT!: number;

  @IsString()
  @IsNotEmpty()
  TCP_HOST!: string;

  @IsString()
  @IsNotEmpty()
  MONGODB_URI!: string;

  @IsString()
  @IsNotEmpty()
  S3_REGION!: string;

  @IsString()
  @IsNotEmpty()
  S3_BUCKET!: string;

  @IsString()
  @IsNotEmpty()
  S3_ACCESS_KEY_ID!: string;

  @IsString()
  @IsNotEmpty()
  S3_SECRET_ACCESS_KEY!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  S3_ENDPOINT?: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  S3_FORCE_PATH_STYLE = false;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_URL!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  RABBITMQ_PREFETCH_COUNT = 20;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  POST_IMAGE_CONCURRENCY = 5;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_MAIN_TO_FILES_QUEUE!: string;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_FILES_TO_MAIN_QUEUE!: string;
}
