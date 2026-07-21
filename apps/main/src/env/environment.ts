import { IsEnum, IsInt, IsUrl, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum Environment {
  Production = 'production',
  Development = 'development',
  DevelopmentLocal = 'development.local',
  Testing = 'testing',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsUrl(
    {
      protocols: ['postgresql', 'postgres'],
      require_protocol: true,
    },
    {
      message: 'DATABASE_URL must be a valid Prisma URL',
    },
  )
  DATABASE_URL!: string;
}
