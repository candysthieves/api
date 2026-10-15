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

  async requestCancellation(
    userId: string,
    requestedAt: Date,
  ): Promise<boolean> {
    const subscription = await this.db
      .selectFrom('subscriptions')
      .select(['id', 'cancellationRequestedAt'])
      .where('userId', '=', userId)
      .where('expirationDate', '>', requestedAt)
      .orderBy('expirationDate', 'desc')
      .executeTakeFirst();

    if (!subscription) return false;
    if (subscription.cancellationRequestedAt) return true;

    await this.db
      .updateTable('subscriptions')
      .set({ cancellationRequestedAt: requestedAt })
      .where('id', '=', subscription.id)
      .where('cancellationRequestedAt', 'is', null)
      .execute();

    return true;
  }
}
