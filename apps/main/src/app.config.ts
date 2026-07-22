import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';

@Injectable()
export class AppConfig {
  readonly port: number;
  readonly databaseUrl: string;
  readonly accessSecret: string;
  readonly accessExpiresIn: string;
  readonly refreshSecret: string;
  readonly refreshExpiresIn: string;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.port = Number(configService.getOrThrow<string>('PORT'));
    this.databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
    this.accessSecret = configService.getOrThrow<string>('JWT_SECRET_KEY');
    this.accessExpiresIn = configService.getOrThrow<string>('JWT_EXPIRES_IN');
    this.refreshSecret = configService.getOrThrow<string>(
      'JWT_SECRET_REFRESH_KEY',
    );
    this.refreshExpiresIn = configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
  }

  get refreshTokenMaxAge(): number {
    return ms(this.refreshExpiresIn as ms.StringValue);
  }
}
