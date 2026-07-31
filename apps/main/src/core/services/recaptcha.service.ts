import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../app.config.js';

interface RecaptchaVerificationResponse {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
}

@Injectable()
export class RecaptchaService {
  private static readonly verificationUrl =
    'https://www.google.com/recaptcha/api/siteverify';
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly config: AppConfig) {}

  async verifyPasswordRecovery(token: string): Promise<void> {
    let result: RecaptchaVerificationResponse;
    let response: Response;

    try {
      response = await fetch(RecaptchaService.verificationUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: this.config.recaptchaSecretKey,
          response: token,
        }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      this.reject('google_request_error');
    }

    if (!response.ok) {
      this.reject('google_response_error');
    }

    try {
      result = (await response.json()) as RecaptchaVerificationResponse;
    } catch {
      this.reject('google_response_error');
    }

    if (result.success !== true) {
      this.reject('verification_failed', result.score);
    }
    if (result.action !== 'password_recovery') {
      this.reject('action_mismatch', result.score);
    }
    if (
      typeof result.score !== 'number' ||
      result.score < this.config.recaptchaMinScore
    ) {
      this.reject('score_too_low', result.score);
    }
    if (
      typeof result.hostname !== 'string' ||
      !this.config.recaptchaAllowedHostnames.has(result.hostname.toLowerCase())
    ) {
      this.reject('hostname_mismatch', result.score);
    }
  }

  private reject(category: string, score?: number): never {
    const scoreSuffix = typeof score === 'number' ? ` score=${score}` : '';
    this.logger.warn(`reCAPTCHA rejected: ${category}${scoreSuffix}`);
    throw new ForbiddenException('reCAPTCHA verification failed.');
  }
}
