import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { Session } from '../../../../generated/prisma/client.js';

@Injectable()
export class SessionsQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSessionsForUser(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId, deletedAt: null },
    });
  }
}
