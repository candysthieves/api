import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { SessionsQueryRepository } from '../../../repositories/sessionRepositories/sessions.queryRepository.js';
import type { Session } from '../../../../../generated/prisma/client.js';
import { mapSessionsToView } from '../../../mappers/sessions.mapper.js';
import { SessionView } from '../../../api/view-types/sessions/sessionView.type.js';

export class FindAllSessionsQuery {
  constructor(public userId: string) {}
}

@QueryHandler(FindAllSessionsQuery)
export class FindAllSessionsQueryHandler implements IQueryHandler<
  FindAllSessionsQuery,
  SessionView[]
> {
  constructor(
    @Inject(SessionsQueryRepository)
    private sessionsQueryRepository: SessionsQueryRepository,
  ) {}

  async execute(query: FindAllSessionsQuery): Promise<SessionView[]> {
    const sessions: Session[] =
      await this.sessionsQueryRepository.findSessionsForUser(query.userId);

    return mapSessionsToView(sessions);
  }
}
