import { Injectable } from '@nestjs/common';
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
export class RecaptchaAdapter {
  // Официальный серверный endpoint Google для проверки reCAPTCHA-токена.
  private static readonly verificationUrl =
    'https://www.google.com/recaptcha/api/siteverify';

  constructor(private readonly config: AppConfig) {}

  async verifyPasswordRecovery(token: string): Promise<void> {
    // Отправляем Google серверный secret и токен, полученный от виджета v2.
    const response = await fetch(RecaptchaAdapter.verificationUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: this.config.recaptchaSecretKey,
        response: token,
      }),
    });

    // Читаем JSON-ответ Google; повреждённый ответ также считается отказом.
    const responseData: unknown = await response.json();
    const result = responseData as RecaptchaVerificationResponse;
    const hostname = result.hostname?.trim().toLowerCase();

    // Google должен явно подтвердить, что токен действителен.
    if (
      !result.success ||
      !hostname ||
      !this.config.recaptchaAllowedHostnames.has(hostname)
    ) {
      return DomainExceptions.badRequest(
        ErrorStatus.RECAPTCHA_INVALID,
        'recaptchaToken',
        'reCAPTCHA verification failed',
      );
    }
  }
}
