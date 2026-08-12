import { Injectable } from '@nestjs/common';
import { SessionEntity } from '../domain/entities/session.entity.js';
import { JwtAdapter } from '../../../core/adapters/jwt.adapter.js';
import { AppConfig } from '../../../app.config.js';
import { SessionsRepository } from '../infrastructure/repositories/session-repositories/sessions.repository.js';
import { AccessAndRefreshTokensType } from '../../../core/types/access-and-refresh-tokens.type.js';

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
    const session = SessionEntity.create({
      userId: userId,
      ip,
      deviceName: userAgent,
      lifetimeMs: this.config.refreshTokenMaxAge,
    });
    await this.sessionsRepository.save(session);

    const accessToken: string = await this.jwtAdapter.createAccessToken(userId);
    const refreshToken: string = await this.jwtAdapter.createRefreshToken(
      userId,
      session.id,
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
