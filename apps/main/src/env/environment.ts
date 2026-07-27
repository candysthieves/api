import { IsInt, Min, Max, IsNotEmpty, IsString } from 'class-validator';
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
}
