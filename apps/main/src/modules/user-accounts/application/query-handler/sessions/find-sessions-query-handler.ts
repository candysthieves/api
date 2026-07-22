import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { JwtAdapter } from '../../../../../core/adapters/jwt.adapter.js';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { JwtRefreshPayload } from '../../../../../core/types/jwt-payload.type.js';
import { SessionsQueryRepository } from '../../../repositories/sessionRepositories/sessions.queryRepository.js';
import type { Session } from '../../../../../generated/prisma/client.js';
import { mapSessionsToView } from '../../../mappers/sessions.mapper.js';
import { SessionView } from '../../../api/view-types/sessions/sessionView.type.js';

export class FindAllSessionsQuery {
  constructor(public refreshToken: string) {}
}

@QueryHandler(FindAllSessionsQuery)
export class FindAllSessionsQueryHandler implements IQueryHandler<
  FindAllSessionsQuery,
  SessionView[]
> {
  constructor(
    @Inject(JwtAdapter) private jwtAdapter: JwtAdapter,
    @Inject(SessionsQueryRepository)
    private sessionsQueryRepository: SessionsQueryRepository,
  ) {}

  async execute(query: FindAllSessionsQuery): Promise<SessionView[]> {
    if (!query.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const payload: JwtRefreshPayload = await this.jwtAdapter.verifyRefreshToken(
      query.refreshToken,
    );
    if (!payload.userId || !payload.sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessions: Session[] =
      await this.sessionsQueryRepository.findSessionsForUser(payload.userId);

    return mapSessionsToView(sessions);
  }
}
