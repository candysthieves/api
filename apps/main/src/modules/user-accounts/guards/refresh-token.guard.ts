import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAdapter } from '../../../core/adapters/jwt.adapter.js';
import { JwtRefreshPayload } from '../../../core/types/jwt-payload.type.js';
import { RequestWithUser } from '../../../core/types/request-with-user.type.js';
import { SessionsRepository } from '../repositories/sessionRepositories/sessions.repository.js';
import { DomainExceptions } from '../../../core/exceptions/domain-exceptions.js';

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
      DomainExceptions.unauthorized();
    }

    const payload: JwtRefreshPayload =
      await this.jwtAdapter.verifyRefreshToken(token);

    req.user = payload;
    const session = await this.sessionsRepository.findById(payload.sessionId);
    if (!session || session.userId !== payload.userId) {
      DomainExceptions.unauthorized();
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
