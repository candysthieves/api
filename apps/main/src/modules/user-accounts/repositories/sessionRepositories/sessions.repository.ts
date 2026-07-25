import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { SessionEntity } from '../../domain/entities/session.entity.js';

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(session: SessionEntity): Promise<void> {
    await this.prisma.session.create({ data: session.toPersistence() });
  }

  async findActiveById(sessionId: string): Promise<SessionEntity | null> {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        expiresAt: { gt: new Date() },
        deletedAt: null,
      },
    });

    return session ? SessionEntity.restore(session) : null;
  }

  async deleteById(sessionId: string, userId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
