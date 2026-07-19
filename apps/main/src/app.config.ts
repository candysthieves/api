import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

@Injectable()
export class AppConfig {
  @IsInt({ message: 'PORT must be an integer' })
  @Min(1, { message: 'PORT must be greater than 0' })
  @Max(65535, { message: 'PORT must not exceed 65535' })
  readonly port: number;

  @IsString({
    message: 'DATABASE_URL must be a string',
  })
  @IsNotEmpty({
    message: 'Set ENV variable DATABASE_URL',
  })
  readonly databaseUrl: string;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.port = Number(configService.getOrThrow('PORT'));
    this.databaseUrl = configService.getOrThrow('DATABASE_URL');

    const errors = validateSync(this);
    if (errors.length > 0) {
      throw new Error(errors.toString());
    }
  }
}
