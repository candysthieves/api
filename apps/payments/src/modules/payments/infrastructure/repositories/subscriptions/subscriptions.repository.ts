import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import { Kysely, sql } from 'kysely';
import { PaymentDatabase } from '../../../../../database/types/payment-database.type.js';
import { executeMutation } from '../../../../../database/execute-mutation.js';

const toClickHouseDateTime = (date: Date) =>
  sql<Date>`parseDateTimeBestEffort(${date.toISOString()})`;

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE)
    private readonly db: Kysely<PaymentDatabase>,
  ) {}

  findSubscriptionByUserId(userId: string) {
    return this.db
      .selectFrom('subscriptions')
      .select('id')
      .where('userId', '=', userId)
      .executeTakeFirst();
  }

  async saveSubscription(
    userId: string,
    tariffId: string,
    paymentId: string,
    durationDays: number,
  ): Promise<void> {
    await executeMutation(
      this.db,
      this.db.insertInto('subscriptions').values({
        userId,
        tariffId,
        lastPaymentId: paymentId,
        expirationDate: sql<Date>`now() + toIntervalDay(${durationDays})`,
        cancellationRequestedAt: sql<null>`NULL`,
      }),
    );
  }

  async updateSubscription(
    userId: string,
    tariffId: string,
    paymentId: string,
    durationDays: number,
  ): Promise<void> {
    await executeMutation(
      this.db,
      this.db
        .updateTable('subscriptions')
        .set({
          tariffId,
          lastPaymentId: paymentId,
          expirationDate: sql<Date>`now() + toIntervalDay(${durationDays})`,
          cancellationRequestedAt: sql<null>`NULL`,
        })
        .where('userId', '=', userId)
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
  }

  async findActiveSubscription(userId: string, at: Date) {
    return this.db
      .selectFrom('subscriptions')
      .select('id')
      .where('userId', '=', userId)
      .where('expirationDate', '>', toClickHouseDateTime(at))
      .orderBy('expirationDate', 'desc')
      .executeTakeFirst();
  }

  async findCurrentSubscription(userId: string, at: Date) {
    return this.db
      .selectFrom('subscriptions')
      .select(['expirationDate', 'cancellationRequestedAt'])
      .where('userId', '=', userId)
      .where('expirationDate', '>', toClickHouseDateTime(at))
      .orderBy('expirationDate', 'desc')
      .executeTakeFirst();
  }

  async requestCancellation(subscriptionId: string, requestedAt: Date) {
    await this.db
      .updateTable('subscriptions')
      .set({ cancellationRequestedAt: toClickHouseDateTime(requestedAt) })
      .where('id', '=', subscriptionId)
      .where('cancellationRequestedAt', 'is', null)
      .execute();
  }
}
