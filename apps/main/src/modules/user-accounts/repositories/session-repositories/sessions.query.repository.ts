import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { Session } from '../../../../generated/prisma/client.js';

@Injectable()
export class SessionsQueryRepository {
  private readonly prismaSession: PrismaService['session'];
  constructor(private readonly prisma: PrismaService) {
    this.prismaSession = prisma.session;
  }

  async findSessionsForUser(userId: string): Promise<Session[]> {
    return this.prismaSession.findMany({
      where: { userId, deletedAt: null },
    });
  }
}
