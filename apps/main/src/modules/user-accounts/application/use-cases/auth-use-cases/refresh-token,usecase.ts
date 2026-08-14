import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtRefreshPayload } from '../../../../../core/types/jwt-payload.type.js';
import { JwtAdapter } from '../../../../../core/adapters/jwt.adapter.js';
import { AccessAndRefreshTokensType } from '../../../../../core/types/access-and-refresh-tokens.type.js';
import { SessionsRepository } from '../../../infrastructure/repositories/session-repositories/sessions.repository.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

export class RefreshTokenCommand {
  constructor(public readonly payload: JwtRefreshPayload) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenUseCase implements ICommandHandler<RefreshTokenCommand> {
  constructor(
    private readonly jwtAdapter: JwtAdapter,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async execute({
    payload,
  }: RefreshTokenCommand): Promise<AccessAndRefreshTokensType> {
    const accessToken: string = await this.jwtAdapter.createAccessToken(
      payload.userId,
    );
    const refreshToken: string = await this.jwtAdapter.createRefreshToken(
      payload.userId,
      payload.sessionId,
    );
    const refreshPayload = this.jwtAdapter.decodeRefreshToken(refreshToken);
    const wasUpdated = await this.sessionsRepository.updateTokenDates(
      payload.sessionId,
      new Date(refreshPayload.iat * 1000),
      new Date(refreshPayload.exp * 1000),
    );

    if (!wasUpdated) {
      DomainExceptions.unauthorized(
        ErrorStatus.SESSION_NOT_FOUND,
        'session',
        'Session not found',
      );
    }

    return { accessToken, refreshToken };
  }
}
