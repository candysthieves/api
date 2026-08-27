import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAdapter } from '../../../../core/adapters/jwt.adapter.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';
import { Request } from 'express';
import { JwtAccessPayload } from '../../../../core/types/jwt-payload.type.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwtAdapter: JwtAdapter) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader) {
      DomainExceptions.unauthorized(
        ErrorStatus.SESSION_NOT_FOUND,
        'session',
        'Session not found',
      );
    }

    const match = authHeader.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      DomainExceptions.unauthorized(
        ErrorStatus.SESSION_NOT_FOUND,
        'session',
        'Session not found',
      );
    }

    const [, accessToken] = match;

    const payload: JwtAccessPayload =
      await this.jwtAdapter.verifyAccessToken(accessToken);

    request.user = {
      ...payload,
    };

    return true;
  }
}
