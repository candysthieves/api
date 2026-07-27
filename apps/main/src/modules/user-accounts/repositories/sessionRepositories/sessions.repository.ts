import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { SessionEntity } from '../../domain/entities/session.entity.js';
import type { Session } from '../../../../generated/prisma/client.js';

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(session: SessionEntity): Promise<void> {
    await this.prisma.session.create({ data: session.toPersistence() });
  }

  async findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.session.delete({ where: { id } });
  }
}
