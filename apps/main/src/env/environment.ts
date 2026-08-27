import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
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
  get RECAPTCHA_ALLOWED_HOSTNAMES(): string {
    return this._RECAPTCHA_ALLOWED_HOSTNAMES;
  }

  set RECAPTCHA_ALLOWED_HOSTNAMES(value: string) {
    this._RECAPTCHA_ALLOWED_HOSTNAMES = value;
  }

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  APP_URL!: string;

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
  EMAIL_CONFIRMATION_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  SMTP_USER!: string;

  @IsString()
  @IsNotEmpty()
  SMTP_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID!: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_CLIENT_ID!: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_CLIENT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  RECAPTCHA_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  CLIENT_URL!: string;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_URL!: string;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_MAIN_TO_FILES_QUEUE!: string;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_FILES_TO_MAIN_QUEUE!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\s*[^,\s]+(?:\s*,\s*[^,\s]+)*\s*$/)
  private _RECAPTCHA_ALLOWED_HOSTNAMES!: string;
}
