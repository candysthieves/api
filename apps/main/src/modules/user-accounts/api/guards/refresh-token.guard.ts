import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAdapter } from '../../../../core/adapters/jwt.adapter.js';
import { JwtRefreshPayload } from '../../../../core/types/jwt-payload.type.js';
import { RequestWithUser } from '../../../../core/types/request-with-user.type.js';
import { SessionsRepository } from '../../infrastructure/repositories/session-repositories/sessions.repository.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly jwtAdapter: JwtAdapter,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const cookies = req.cookies as { refreshToken?: string };
    const token = cookies.refreshToken;
    if (!token) {
      DomainExceptions.unauthorized(
        ErrorStatus.REFRESH_TOKEN_MISSING,
        'refreshToken',
        'Refresh token is missing',
      );
    }

    const payload: JwtRefreshPayload =
      await this.jwtAdapter.verifyRefreshToken(token);

    req.user = payload;
    const session = await this.sessionsRepository.findActiveById(
      payload.sessionId,
    );
    if (!session) {
      DomainExceptions.unauthorized(
        ErrorStatus.SESSION_NOT_FOUND,
        'session',
        'Session not found',
      );
    }

    if (session.userId !== payload.userId) {
      DomainExceptions.unauthorized(
        ErrorStatus.SESSION_USER_MISMATCH,
        'session',
        'Session does not belong to this user',
      );
    }

    req.user = {
      userId: payload.userId,
      sessionId: payload.sessionId,
      iat: payload.iat,
      exp: payload.exp,
    };

    return true;
  }
}
