// Общий обработчик событий inbox и outbox в PostgreSQL.
// Выбирает и захватывает события, управляет повторами, восстанавливает зависшие
// и очищает завершённые записи.
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '../../generated/prisma/client.js';
import type { InboxEvent } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { EventRepository } from './types/event-repository.type.js';
import type { EventTable } from './types/event-table.type.js';

const EVENT_TABLES: EventTable[] = ['inboxEvent', 'outputEvent'];

@Injectable()
export class EventStoreService {
  private readonly running = new Set<EventTable>();
  // Получает Prisma-клиент для работы с таблицами событий.
  constructor(private readonly prisma: PrismaService) {}

  // Обрабатывает до десяти ожидающих событий одной таблицы.
  async run(
    table: EventTable,
    handle: (event: InboxEvent) => Promise<void>,
  ): Promise<void> {
    // Не допускаем параллельную обработку одной таблицы.
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
        events.map((event) => this.processEvent(repository, event, handle)),
      );
      // Держим защиту, пока не завершатся все события, даже при ошибке БД.
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;
    } finally {
      this.running.delete(table);
    }
  }

  // Захватывает событие, выполняет его и сохраняет результат.
  private async processEvent(
    repository: EventRepository,
    event: InboxEvent,
    handle: (event: InboxEvent) => Promise<void>,
  ): Promise<void> {
    const attempts = (event.attempts ?? 0) + 1;
    // Условное обновление позволяет забрать событие только одному воркеру.
    const claim = await repository.updateMany({
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
    if (!claim.count) return;

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
      const exhausted = attempts >= 3;
      await repository.updateMany({
        where,
        data: {
          status: exhausted ? 'ERROR' : 'UNPROCESSED',
          completedAt: exhausted ? new Date() : null,
          nextAttemptAt: exhausted ? null : new Date(Date.now() + 10_000),
          processingStartedAt: null,
          lastError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  // Возвращает в очередь события, застрявшие в обработке.
  @Cron(CronExpression.EVERY_10_SECONDS, { waitForCompletion: true })
  async recover(): Promise<void> {
    const now = Date.now();
    const processingDeadline = new Date(now - 60_000);
    const retryAt = new Date(now + 10_000);
    const completedAt = new Date(now);

    // Возвращаем зависшие события в очередь или завершаем после третьей попытки.
    for (const table of EVENT_TABLES) {
      const repository: EventRepository = this.prisma[table];
      const staleEventFilter = {
        status: 'PROCESSING' as const,
        processingStartedAt: { lt: processingDeadline },
      };

      await repository.updateMany({
        where: {
          ...staleEventFilter,
          OR: [{ attempts: null }, { attempts: { lt: 3 } }],
        },
        data: {
          status: 'UNPROCESSED',
          processingStartedAt: null,
          nextAttemptAt: retryAt,
          completedAt: null,
          lastError: 'PROCESSING_TIMEOUT',
        },
      });

      await repository.updateMany({
        where: { ...staleEventFilter, attempts: { gte: 3 } },
        data: {
          status: 'ERROR',
          processingStartedAt: null,
          nextAttemptAt: null,
          completedAt,
          lastError: 'PROCESSING_TIMEOUT',
        },
      });
    }
  }

  // Очищает данные завершённых событий старше часа.
  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  async cleanup(): Promise<void> {
    // Через час удаляем содержимое завершённых событий.
    for (const table of EVENT_TABLES) {
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
