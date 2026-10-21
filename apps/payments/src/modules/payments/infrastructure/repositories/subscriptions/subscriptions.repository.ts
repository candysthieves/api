import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import { Insertable, Kysely, sql } from 'kysely';
import {
  PaymentDatabase,
  SubscriptionTable,
} from '../../../../../database/types/payment-database.type.js';

function formatClickhouseDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE)
    private readonly db: Kysely<PaymentDatabase>,
  ) {}

  async create(subscription: Insertable<SubscriptionTable>): Promise<void> {
    const formattedExpiration =
      subscription.expirationDate instanceof Date
        ? formatClickhouseDateTime(subscription.expirationDate)
        : subscription.expirationDate;

    await this.db
      .insertInto('subscriptions')
      .values({
        ...subscription,
        expirationDate: formattedExpiration as unknown as Date,
      })
      .execute();
  }

  async findActiveSubscription(userId: string, at: Date) {
    const formattedAt = formatClickhouseDateTime(at);

    return this.db
      .selectFrom('subscriptions')
      .selectAll()
      .where('userId', '=', userId)
      .where('expirationDate', '>', sql<Date>`toDateTime(${formattedAt})`)
      .orderBy('expirationDate', 'desc')
      .executeTakeFirst();
  }

  async requestCancellation(subscriptionId: string, requestedAt: Date) {
    const formattedAt = formatClickhouseDateTime(requestedAt);

    await this.db
      .updateTable('subscriptions')
      .set({
        cancellationRequestedAt: sql<Date>`toDateTime(${formattedAt})` as unknown as Date,
      })
      .where('id', '=', subscriptionId)
      .where('cancellationRequestedAt', 'is', null)
      .execute();
  }
}
