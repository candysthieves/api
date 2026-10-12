import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class EnvironmentVariables {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3009;
}
