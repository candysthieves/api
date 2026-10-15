import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import { PaymentDatabase } from '../../../../../database/types/payment-database.type.js';

@Injectable()
export class SubscriptionTypesQueryRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE)
    private readonly db: Kysely<PaymentDatabase>,
  ) {}

  getSubscriptionTypes() {
    return this.db
      .selectFrom('subscription_types')
      .select('namePaymentStatus')
      .where('deletedAt', 'is', null)
      .orderBy('id', 'asc')
      .execute();
  }
}
