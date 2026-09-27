import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';
import { AppConfig } from '../../../../app.config.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Basic\s+([A-Za-z0-9+/]+={0,2})$/i);

    if (!match) {
      return this.reject();
    }

    const encodedCredentials = match[1];
    const credentialsBuffer = Buffer.from(encodedCredentials, 'base64');
    const canonicalBase64 = credentialsBuffer
      .toString('base64')
      .replace(/=+$/, '');

    if (canonicalBase64 !== encodedCredentials.replace(/=+$/, '')) {
      return this.reject();
    }

    const credentials = credentialsBuffer.toString('utf8');
    const separatorIndex = credentials.indexOf(':');

    if (separatorIndex < 1) {
      return this.reject();
    }

    const username = credentials.slice(0, separatorIndex);
    const password = credentials.slice(separatorIndex + 1);

    if (
      !securelyEquals(username, this.config.adminUsername) ||
      !securelyEquals(password, this.config.adminPassword)
    ) {
      return this.reject();
    }

    return true;
  }

  private reject(): never {
    return DomainExceptions.unauthorized(
      ErrorStatus.INVALID_CREDENTIALS,
      'admin',
      'Invalid administrator credentials',
    );
  }
}

function securelyEquals(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}
