import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import { Kysely } from 'kysely';
import { PaymentDatabase } from '../../../../../database/types/payment-database.type.js';

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE)
    private readonly db: Kysely<PaymentDatabase>,
  ) {}

  async findActiveSubscription(userId: string, at: Date) {
    return this.db
      .selectFrom('subscriptions')
      .select('id')
      .where('userId', '=', userId)
      .where('expirationDate', '>', at)
      .orderBy('expirationDate', 'desc')
      .executeTakeFirst();
  }

  async requestCancellation(subscriptionId: string, requestedAt: Date) {
    await this.db
      .updateTable('subscriptions')
      .set({ cancellationRequestedAt: requestedAt })
      .where('id', '=', subscriptionId)
      .where('cancellationRequestedAt', 'is', null)
      .execute();
  }
}
