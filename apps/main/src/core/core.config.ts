import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsEnum } from 'class-validator';

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TESTING = 'testing',
}

@Injectable()
export class CoreConfig {
  @IsEnum(Environment)
  readonly env: Environment;

  constructor(private readonly configService: ConfigService) {
    this.env = this.configService.getOrThrow<Environment>('NODE_ENV');
  }
}
