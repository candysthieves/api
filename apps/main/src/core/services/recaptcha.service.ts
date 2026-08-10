import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../app.config.js';
import { DomainExceptions } from '../exceptions/domain-exceptions.js';
import { ErrorStatus } from '../exceptions/domain-exception-code.js';

interface RecaptchaVerificationResponse {
  // Google подтверждает успешность проверки токена.
  success?: boolean;
  // Домен, для которого Google выпустил токен.
  hostname?: string;
}

@Injectable()
export class RecaptchaService {
  // Официальный серверный endpoint Google для проверки reCAPTCHA-токена.
  private static readonly verificationUrl =
    'https://www.google.com/recaptcha/api/siteverify';
  // Логируем техническую категорию отказа, не раскрывая её клиенту.
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly config: AppConfig) {}

  async verifyPasswordRecovery(token: string): Promise<void> {
    // Отправляем Google серверный secret и токен, полученный от виджета v2.
    const response = await fetch(RecaptchaService.verificationUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: this.config.recaptchaSecretKey,
        response: token,
      }),
      signal: AbortSignal.timeout(5_000),
    });

    // Читаем JSON-ответ Google; повреждённый ответ также считается отказом.
    // TODO когда будет готов фронт, указать явный тип ( не присваивать, а указать)
    const result = (await response.json()) as RecaptchaVerificationResponse;

    // Google должен явно подтвердить, что токен действителен.
    if (!result.success) {
      return DomainExceptions.badRequest(
        ErrorStatus.RECAPTCHA_INVALID,
        'recaptchaToken',
        'reCAPTCHA verification failed',
      );
    }
  }
}
