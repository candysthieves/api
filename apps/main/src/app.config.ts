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
  readonly emailConfirmationExpiresIn: string;
  readonly passwordRecoveryExpiresIn: string;
  readonly smtpUser: string;
  readonly smtpPassword: string;
  readonly recaptchaSecretKey: string;
  readonly recaptchaMinScore: number;
  readonly recaptchaAllowedHostnames: ReadonlySet<string>;

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
    this.emailConfirmationExpiresIn = configService.getOrThrow<string>(
      'EMAIL_CONFIRMATION_EXPIRES_IN',
    );
    this.passwordRecoveryExpiresIn = configService.getOrThrow<string>(
      'PASSWORD_RECOVERY_EXPIRES_IN',
    );
    this.smtpUser = configService.getOrThrow<string>('SMTP_USER');
    this.smtpPassword = configService.getOrThrow<string>('SMTP_PASSWORD');
    this.recaptchaSecretKey = configService.getOrThrow<string>(
      'RECAPTCHA_SECRET_KEY',
    );
    this.recaptchaMinScore = configService.getOrThrow<number>(
      'RECAPTCHA_MIN_SCORE',
    );
    this.recaptchaAllowedHostnames = new Set(
      configService
        .getOrThrow<string>('RECAPTCHA_ALLOWED_HOSTNAMES')
        .split(',')
        .map((hostname) => hostname.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  get refreshTokenMaxAge(): number {
    return ms(this.refreshExpiresIn as ms.StringValue);
  }
}
