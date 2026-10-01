import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '../../generated/prisma/client.js';
import type { InboxEvent } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

type EventTable = 'inboxEvent' | 'outputEvent';
interface EventRepository {
  findMany(args: {
    where?: Prisma.InboxEventWhereInput & Prisma.OutputEventWhereInput;
    orderBy?: Prisma.InboxEventOrderByWithRelationInput;
    take?: number;
  }): Promise<InboxEvent[]>;
  updateMany(
    args: Prisma.InboxEventUpdateManyArgs & Prisma.OutputEventUpdateManyArgs,
  ): Promise<{ count: number }>;
}

@Injectable()
export class EventStoreService {
  private readonly running = new Set<EventTable>();
  constructor(private readonly prisma: PrismaService) {}

  async run(
    table: EventTable,
    handle: (event: InboxEvent) => Promise<void>,
  ): Promise<void> {
    if (this.running.has(table)) return;
    this.running.add(table);
    try {
      const repository: EventRepository = this.prisma[table];
      const events = await repository.findMany({
        where: {
          status: 'UNPROCESSED',
          attempts: { lt: 3 },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
      const results = await Promise.allSettled(
        events.map(async (event) => {
          const attempts = (event.attempts ?? 0) + 1;
          const claimed = await repository.updateMany({
            where: {
              eventId: event.eventId,
              status: 'UNPROCESSED',
              attempts: event.attempts,
            },
            data: {
              status: 'PROCESSING',
              attempts,
              processingStartedAt: new Date(),
              nextAttemptAt: null,
            },
          });
          if (!claimed.count) return;
          const where = {
            eventId: event.eventId,
            status: 'PROCESSING' as const,
            attempts,
          };
          try {
            await handle({ ...event, attempts, status: 'PROCESSING' });
            await repository.updateMany({
              where,
              data: {
                status: 'OK',
                completedAt: new Date(),
                processingStartedAt: null,
                lastError: null,
              },
            });
          } catch (error) {
            await repository.updateMany({
              where,
              data: {
                status: attempts >= 3 ? 'ERROR' : 'UNPROCESSED',
                completedAt: attempts >= 3 ? new Date() : null,
                nextAttemptAt:
                  attempts >= 3 ? null : new Date(Date.now() + 10_000),
                processingStartedAt: null,
                lastError:
                  error instanceof Error ? error.message : String(error),
              },
            });
          }
        }),
      );
      // Keep the guard until every event settles, even after a database error.
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;
    } finally {
      this.running.delete(table);
    }
  }

  @Cron('*/10 * * * * *', { waitForCompletion: true })
  async recover(): Promise<void> {
    for (const table of ['inboxEvent', 'outputEvent'] as const) {
      const repository: EventRepository = this.prisma[table];
      const events = await repository.findMany({
        where: {
          status: 'PROCESSING',
          processingStartedAt: { lt: new Date(Date.now() - 60_000) },
        },
      });
      for (const event of events) {
        const exhausted = (event.attempts ?? 0) >= 3;
        await repository.updateMany({
          where: {
            eventId: event.eventId,
            status: 'PROCESSING',
            attempts: event.attempts,
            processingStartedAt: event.processingStartedAt,
          },
          data: {
            status: exhausted ? 'ERROR' : 'UNPROCESSED',
            processingStartedAt: null,
            nextAttemptAt: exhausted ? null : new Date(Date.now() + 10_000),
            completedAt: exhausted ? new Date() : null,
            lastError: 'PROCESSING_TIMEOUT',
          },
        });
      }
    }
  }

  @Cron('0 * * * * *', { waitForCompletion: true })
  async cleanup(): Promise<void> {
    for (const table of ['inboxEvent', 'outputEvent'] as const) {
      const repository: EventRepository = this.prisma[table];
      await repository.updateMany({
        where: {
          status: { in: ['OK', 'ERROR'] },
          completedAt: { lte: new Date(Date.now() - 3_600_000) },
        },
        data: {
          consumer: null,
          type: null,
          data: Prisma.DbNull,
          body: null,
          attempts: null,
          processingStartedAt: null,
          nextAttemptAt: null,
          completedAt: null,
          lastError: null,
          createdAt: null,
        },
      });
    }
  }
}
