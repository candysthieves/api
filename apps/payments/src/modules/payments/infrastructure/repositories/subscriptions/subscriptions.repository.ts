import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import { Kysely, sql } from 'kysely';
import type {
  PaymentDatabase,
  PaymentProvider,
  SubscriptionEntity,
} from '../../../../../database/types/payment-database.type.js';
import { executeMutation } from '../../../../../database/execute-mutation.js';

const toClickHouseDateTime = (date: Date | string) =>
  sql<Date>`parseDateTime64BestEffort(${typeof date === 'string' ? date : date.toISOString()}, 3)`;

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE) private readonly db: Kysely<PaymentDatabase>,
  ) {}

  findLatest(userId: string): Promise<SubscriptionEntity | undefined> {
    return this.db
      .selectFrom('subscriptions')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .executeTakeFirst();
  }

  findByLastPaymentId(paymentId: string) {
    return this.db
      .selectFrom('subscriptions')
      .selectAll()
      .where('lastPaymentId', '=', paymentId)
      .executeTakeFirst();
  }

  async createProcessing(
    id: string,
    userId: string,
    tariffId: number,
    provider: PaymentProvider,
    durationDays: number,
  ): Promise<void> {
    await executeMutation(
      this.db,
      this.db.insertInto('subscriptions').values({
        id,
        userId,
        tariffId,
        provider,
        status: 'Processing',
        lastPaymentId: sql<null>`NULL`,
        expirationDate: sql<null>`NULL`,
        nextChargeDate: sql<Date>`now() + toIntervalDay(${durationDays})`,
      }),
    );
  }

  findDueForYookassa(at: Date): Promise<SubscriptionEntity[]> {
    // Determine the latest row among ALL subscriptions before eligibility filters.
    const latestIds = this.db
      .selectFrom('subscriptions')
      .select(sql<string>`argMax(id, tuple(created_at, id))`.as('id'))
      .groupBy('userId');
    return this.db
      .selectFrom('subscriptions')
      .selectAll()
      .where('id', 'in', latestIds)
      .where('status', '=', 'Done')
      .where('provider', '=', 'YOOKASSA')
      .where('expirationDate', '<=', toClickHouseDateTime(at))
      .where('nextChargeDate', 'is not', null)
      .execute();
  }

  async updateSubscriptionsStatusToProcessing(id: string): Promise<void> {
    await executeMutation(
      this.db,
      this.db
        .updateTable('subscriptions')
        .set({ status: 'Processing' })
        .where('id', '=', id)
        .where('status', '=', 'Done')
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
  }

  async addPaymentIdToSubscriptions(id: string, paymentId: string): Promise<void> {
    await executeMutation(
      this.db,
      this.db
        .updateTable('subscriptions')
        .set({ lastPaymentId: paymentId })
        .where('id', '=', id)
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
  }

  async complete(
    id: string,
    paymentId: string,
    durationDays: number,
    paidAt: Date | string,
  ): Promise<void> {
    const expirationDate = sql<Date>`coalesce(expiration_date, ${toClickHouseDateTime(paidAt)}) + toIntervalDay(${durationDays})`;
    await executeMutation(
      this.db,
      this.db
        .updateTable('subscriptions')
        .set({
          status: 'Done',
          expirationDate,
          nextChargeDate: sql<Date | null>`if(isNull(next_charge_date), NULL, ${expirationDate})`,
        })
        .where('id', '=', id)
        .where('lastPaymentId', '=', paymentId)
        .where('status', 'in', ['Processing', 'Failed'])
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
  }

  async fail(id: string): Promise<void> {
    await executeMutation(
      this.db,
      this.db
        .updateTable('subscriptions')
        .set({ status: 'Failed' })
        .where('id', '=', id)
        .where('status', '=', 'Processing')
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
  }

  async failExpiredProcessing(): Promise<void> {
    await executeMutation(
      this.db,
      this.db
        .updateTable('subscriptions')
        .set({ status: 'Failed' })
        .where('status', '=', 'Processing')
        .where(
          sql<boolean>`coalesce(expiration_date, created_at) < now() - INTERVAL 15 MINUTE`,
        )
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
  }

  findActiveSubscription(userId: string, at: Date) {
    return this.db
      .selectFrom('subscriptions')
      .select('id')
      .where('userId', '=', userId)
      .where('status', '=', 'Done')
      .where('expirationDate', '>', toClickHouseDateTime(at))
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .executeTakeFirst();
  }

  findCurrentSubscription(userId: string, at: Date) {
    return this.db
      .selectFrom('subscriptions')
      .select(['expirationDate', 'nextChargeDate'])
      .where('userId', '=', userId)
      .where('status', '=', 'Done')
      .where('expirationDate', '>', toClickHouseDateTime(at))
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .executeTakeFirst();
  }

  async requestCancellation(subscriptionId: string): Promise<void> {
    await executeMutation(
      this.db,
      this.db
        .updateTable('subscriptions')
        .set({ nextChargeDate: sql<null>`NULL` })
        .where('id', '=', subscriptionId)
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
  }
}
