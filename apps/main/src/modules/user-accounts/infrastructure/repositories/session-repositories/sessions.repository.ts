import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import type { Session } from '../../../../../generated/prisma/client.js';
import { SessionCreateInput } from '../../../../../generated/prisma/models/Session.js';

@Injectable()
export class SessionsRepository {
  private readonly prismaSession: PrismaService['session'];
  constructor(private readonly prisma: PrismaService) {
    this.prismaSession = prisma.session;
  }

  async create(sessionData: SessionCreateInput): Promise<Session> {
    return this.prismaSession.create({ data: sessionData });
  }

  async findActiveById(sessionId: string): Promise<Session | null> {
    return this.prismaSession.findFirst({
      where: {
        id: sessionId,
        expiresAt: { gt: new Date() },
        deletedAt: null,
      },
    });
  }

  async deleteById(sessionId: string, userId: string): Promise<void> {
    await this.prismaSession.update({
      where: { id: sessionId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async deleteOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<void> {
    await this.prismaSession.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }

  async deleteAllActiveByUserId(userId: string): Promise<void> {
    await this.prismaSession.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async findById(id: string): Promise<Session | null> {
    return this.prismaSession.findUnique({ where: { id } });
  }

  async updateTokenDates(
    sessionId: string,
    issuedAt: Date,
    expiresAt: Date,
  ): Promise<boolean> {
    const { count } = await this.prismaSession.updateMany({
      where: {
        id: sessionId,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { issuedAt, expiresAt },
    });

    return count === 1;
  }
}
