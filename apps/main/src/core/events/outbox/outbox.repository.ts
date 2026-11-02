import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(event: Prisma.OutputEventCreateInput): Promise<void> {
    await this.prisma.outputEvent.create({ data: event });
  }

  async abortPostImages(postId: string): Promise<void> {
    await this.prisma.outputEvent.updateMany({
      where: {
        status: 'UNPROCESSED',
        data: { path: ['postId'], equals: postId },
      },
      data: {
        status: 'ERROR',
        completedAt: new Date(),
        nextAttemptAt: null,
        lastError: 'POST_CREATION_FAILED',
      },
    });
  }
}
