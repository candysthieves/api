import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import {
  PaymentDatabase,
  SubscriptionNotificationKind,
} from '../../../../../database/types/payment-database.type.js';

@Injectable()
export class SubscriptionNotificationsRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE) private readonly db: Kysely<PaymentDatabase>,
  ) {}

  async createPending(input: {
    id: string;
    userId: string;
    kind: SubscriptionNotificationKind;
  }): Promise<void> {
    await this.db
      .insertInto('subscription_notifications')
      .values({ ...input, createdAt: new Date(), deliveredAt: null })
      .execute();
  }

  findPending(limit: number) {
    return this.db
      .selectFrom('subscription_notifications')
      .selectAll()
      .where('deliveredAt', 'is', null)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .execute();
  }

  async markDelivered(
    notificationId: string,
    deliveredAt: Date,
  ): Promise<void> {
    await this.db
      .updateTable('subscription_notifications')
      .set({ deliveredAt })
      .where('id', '=', notificationId)
      .where('deliveredAt', 'is', null)
      .execute();
  }
}
