import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum Environment {
  Production = 'production',
  Development = 'development',
  DevelopmentLocal = 'development.local',
  Testing = 'testing',
}

export class EnvironmentVariables {
  // @IsEnum(Environment)
  // NODE_ENV!: Environment;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET_REFRESH_KEY!: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  PASSWORD_RECOVERY_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  RECAPTCHA_SECRET_KEY!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  RECAPTCHA_MIN_SCORE: number = 0.5;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\s*[^,\s]+(?:\s*,\s*[^,\s]+)*\s*$/)
  RECAPTCHA_ALLOWED_HOSTNAMES!: string;
}
