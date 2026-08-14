import { Injectable } from '@nestjs/common';
import { JwtAdapter } from '../../../core/adapters/jwt.adapter.js';
import { AppConfig } from '../../../app.config.js';
import { SessionsRepository } from '../infrastructure/repositories/session-repositories/sessions.repository.js';
import { AccessAndRefreshTokensType } from '../../../core/types/access-and-refresh-tokens.type.js';
import { SessionDataFactory } from './factories/session-data.factory.js';
import { Session } from '../../../generated/prisma/client.js';
import { SessionCreateInput } from '../../../generated/prisma/models/Session.js';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly jwtAdapter: JwtAdapter,
    private readonly config: AppConfig,
  ) {}

  async createSessionAndTokens(
    userId: string,
    ip: string,
    userAgent: string,
  ): Promise<AccessAndRefreshTokensType> {
    const sessionData: SessionCreateInput =
      SessionDataFactory.prepareCreateData(
        userId,
        userAgent,
        ip,
        this.config.refreshTokenMaxAge,
      );

    const session: Session = await this.sessionsRepository.create(sessionData);

    const accessToken: string = await this.jwtAdapter.createAccessToken(userId);
    const refreshToken: string = await this.jwtAdapter.createRefreshToken(
      userId,
      session.id,
    );
    const refreshPayload = this.jwtAdapter.decodeRefreshToken(refreshToken);
    await this.sessionsRepository.updateTokenDates(
      session.id,
      new Date(refreshPayload.iat * 1000),
      new Date(refreshPayload.exp * 1000),
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
