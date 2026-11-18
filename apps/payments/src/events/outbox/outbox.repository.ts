import { Inject, Injectable } from '@nestjs/common';
import { sql, type Kysely, type Updateable } from 'kysely';
import type {
  PaymentNotificationEvent,
  PaymentResultEvent,
} from '@libs/contracts';
import { KYSELY_CLICKHOUSE } from '../../database/database.constants.js';
import { executeMutation } from '../../database/execute-mutation.js';
import type { PaymentDatabase } from '../../database/types/payment-database.type.js';
import type { PaymentOutboxTable } from '../payment-event.type.js';

type OutboxKey = Pick<PaymentOutboxTable, 'eventId' | 'consumer'>;

@Injectable()
export class OutboxRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE) private readonly db: Kysely<PaymentDatabase>,
  ) {}

  async save(
    event: PaymentResultEvent | PaymentNotificationEvent,
  ): Promise<void> {
    const existing = await this.db
      .selectFrom('paymentOutbox')
      .select('eventId')
      .where('eventId', '=', event.eventId)
      .where('consumer', '=', event.consumer)
      .executeTakeFirst();
    if (existing) return;
    await this.db
      .insertInto('paymentOutbox')
      .values({
        eventId: event.eventId,
        consumer: event.consumer,
        data: JSON.stringify(event),
        status: 'UNPROCESSED',
        attempts: 0,
        createdAt: Date.now(),
        processingStartedAt: null,
        nextAttemptAt: null,
        completedAt: null,
        lastError: null,
      })
      .execute();
  }

  findPending(): Promise<PaymentOutboxTable[]> {
    return this.db
      .selectFrom('paymentOutbox')
      .selectAll()
      .where('status', '=', 'UNPROCESSED')
      .where('attempts', '<', 3)
      .where((eb) =>
        eb.or([
          eb('nextAttemptAt', 'is', null),
          eb('nextAttemptAt', '<=', Date.now()),
        ]),
      )
      .orderBy('createdAt')
      .limit(10)
      .execute();
  }

  markProcessing(key: OutboxKey, attempts: number): Promise<void> {
    return this.update(key, {
      status: 'PROCESSING',
      attempts,
      processingStartedAt: Date.now(),
      nextAttemptAt: null,
    });
  }

  markCompleted(key: OutboxKey): Promise<void> {
    return this.update(key, {
      status: 'OK',
      completedAt: Date.now(),
      processingStartedAt: null,
      lastError: null,
    });
  }

  markFailed(key: OutboxKey, attempts: number, error: unknown): Promise<void> {
    const exhausted = attempts >= 3;
    return this.update(key, {
      status: exhausted ? 'ERROR' : 'UNPROCESSED',
      nextAttemptAt: exhausted ? null : Date.now() + 10_000,
      completedAt: exhausted ? Date.now() : null,
      processingStartedAt: null,
      lastError: error instanceof Error ? error.message : String(error),
    });
  }

  async recover(): Promise<void> {
    const stale = await this.db
      .selectFrom('paymentOutbox')
      .selectAll()
      .where('status', '=', 'PROCESSING')
      .where('processingStartedAt', '<', Date.now() - 60_000)
      .execute();
    for (const event of stale) {
      await this.markFailed(
        event,
        event.attempts ?? 0,
        new Error('PROCESSING_TIMEOUT'),
      );
    }
  }

  async cleanup(): Promise<void> {
    await executeMutation(
      this.db,
      this.db
        .updateTable('paymentOutbox')
        .set({
          data: sql`NULL`,
          attempts: sql`NULL`,
          createdAt: sql`NULL`,
          processingStartedAt: sql`NULL`,
          nextAttemptAt: sql`NULL`,
          completedAt: sql`NULL`,
          lastError: sql`NULL`,
        })
        .where('status', 'in', ['OK', 'ERROR'])
        .where('completedAt', '<=', Date.now() - 3_600_000)
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
  }

  private async update(
    key: OutboxKey,
    data: Updateable<Omit<PaymentOutboxTable, 'eventId' | 'consumer'>>,
  ): Promise<void> {
    // Драйверу нужен SQL NULL, а не строковый параметр 'null'.
    const values = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === null ? sql`NULL` : value,
      ]),
    );
    await executeMutation(
      this.db,
      this.db
        .updateTable('paymentOutbox')
        .set(values)
        .where('eventId', '=', key.eventId)
        .where('consumer', '=', key.consumer)
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
  }
}
