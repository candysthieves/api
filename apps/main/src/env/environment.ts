import { IsInt, Min, Max, IsString } from 'class-validator';
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
}
