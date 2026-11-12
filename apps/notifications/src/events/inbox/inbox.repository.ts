import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import type { PaymentNotificationEvent } from '@libs/contracts';
import { REDIS_CLIENT } from '../../database/database.constants.js';
import type { NotificationEventRecord } from '../notification-event.type.js';

@Injectable()
export class InboxRepository {
  private readonly PENDING_SET = 'notifications:inbox:pending';
  private readonly PROCESSING_SET = 'notifications:inbox:processing';
  private readonly COMPLETED_SET = 'notifications:inbox:completed';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private getKey(eventId: string): string {
    return `notifications:inbox:event:${eventId}`;
  }

  async save(event: PaymentNotificationEvent): Promise<void> {
    const key = this.getKey(event.eventId);

    const record: NotificationEventRecord = {
      eventId: event.eventId,
      data: JSON.stringify(event),
      status: 'UNPROCESSED',
      attempts: 0,
      createdAt: Date.now(),
      processingStartedAt: null,
      nextAttemptAt: null,
      completedAt: null,
      lastError: null,
    };

    await this.redis
      .multi()
      .set(key, JSON.stringify(record))
      .zadd(this.PENDING_SET, record.createdAt, event.eventId)
      .exec();
  }

  async findPending(): Promise<NotificationEventRecord[]> {
    const now = Date.now();
    // Берем ID из очереди ожидающих (score = время, когда можно выполнять)
    const eventIds = await this.redis.zrangebyscore(
      this.PENDING_SET,
      '-inf',
      now,
      'LIMIT',
      0,
      10,
    );
    if (!eventIds.length) return [];

    const keys = eventIds.map((id) => this.getKey(id));
    const records = await this.redis.mget(...keys);

    return records
      .filter((raw): raw is string => raw !== null)
      .map((raw) => JSON.parse(raw) as NotificationEventRecord)
      .filter(
        (rec) =>
          rec.status === 'UNPROCESSED' &&
          (rec.attempts ?? 0) < 3 &&
          (rec.nextAttemptAt === null || rec.nextAttemptAt <= now),
      );
  }

  async markProcessing(eventId: string, attempts: number): Promise<void> {
    const key = this.getKey(eventId);
    const raw = await this.redis.get(key);
    if (!raw) return;

    const record = JSON.parse(raw) as NotificationEventRecord;
    const now = Date.now();
    record.status = 'PROCESSING';
    record.attempts = attempts;
    record.processingStartedAt = now;
    record.nextAttemptAt = null;

    await this.redis
      .multi()
      .set(key, JSON.stringify(record))
      .zrem(this.PENDING_SET, eventId)
      .zadd(this.PROCESSING_SET, now, eventId)
      .exec();
  }

  async markCompleted(eventId: string): Promise<void> {
    const key = this.getKey(eventId);
    const raw = await this.redis.get(key);
    if (!raw) return;

    const record = JSON.parse(raw) as NotificationEventRecord;
    const now = Date.now();
    record.status = 'OK';
    record.completedAt = now;
    record.processingStartedAt = null;
    record.lastError = null;

    await this.redis
      .multi()
      .set(key, JSON.stringify(record))
      .zrem(this.PROCESSING_SET, eventId)
      .zrem(this.PENDING_SET, eventId)
      .zadd(this.COMPLETED_SET, now, eventId)
      .exec();
  }

  async markFailed(
    eventId: string,
    attempts: number,
    error: unknown,
  ): Promise<void> {
    const key = this.getKey(eventId);
    const raw = await this.redis.get(key);
    if (!raw) return;

    const record = JSON.parse(raw) as NotificationEventRecord;
    const now = Date.now();
    const exhausted = attempts >= 3;

    record.status = exhausted ? 'ERROR' : 'UNPROCESSED';
    record.attempts = attempts;
    record.nextAttemptAt = exhausted ? null : now + 10_000;
    record.completedAt = exhausted ? now : null;
    record.processingStartedAt = null;
    record.lastError = error instanceof Error ? error.message : String(error);

    const pipeline = this.redis.multi();
    pipeline.set(key, JSON.stringify(record));
    pipeline.zrem(this.PROCESSING_SET, eventId);

    if (exhausted) {
      pipeline.zrem(this.PENDING_SET, eventId);
      pipeline.zadd(this.COMPLETED_SET, now, eventId);
    } else {
      pipeline.zadd(this.PENDING_SET, record.nextAttemptAt!, eventId);
    }

    await pipeline.exec();
  }

  async recover(): Promise<void> {
    const staleBefore = Date.now() - 60_000;
    const staleEventIds = await this.redis.zrangebyscore(
      this.PROCESSING_SET,
      '-inf',
      staleBefore,
    );
    for (const eventId of staleEventIds) {
      const raw = await this.redis.get(this.getKey(eventId));
      if (!raw) continue;
      const record = JSON.parse(raw) as NotificationEventRecord;
      await this.markFailed(
        eventId,
        record.attempts ?? 0,
        new Error('PROCESSING_TIMEOUT'),
      );
    }
  }

  async cleanup(): Promise<void> {
    const expiredBefore = Date.now() - 3_600_000; // 1 час
    const finishedEventIds = await this.redis.zrangebyscore(
      this.COMPLETED_SET,
      '-inf',
      expiredBefore,
    );
    for (const eventId of finishedEventIds) {
      const key = this.getKey(eventId);
      const raw = await this.redis.get(key);
      if (!raw) continue;
      const record = JSON.parse(raw) as NotificationEventRecord;
      // Очищаем данные события до ID и статуса (как требует архитектура проекта)
      const cleanRecord: NotificationEventRecord = {
        eventId: record.eventId,
        status: record.status,
        data: null,
        attempts: record.attempts,
        createdAt: record.createdAt,
        processingStartedAt: null,
        nextAttemptAt: null,
        completedAt: record.completedAt,
        lastError: null,
      };
      await this.redis
        .multi()
        .set(key, JSON.stringify(cleanRecord))
        .zrem(this.COMPLETED_SET, eventId)
        .exec();
    }
  }
}
