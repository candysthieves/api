import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import { Kysely } from 'kysely';
import {
  PaymentDatabase,
  SubscriptionTypeName,
} from '../../../../../database/types/payment-database.type.js';

@Injectable()
export class TariffsQueryRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE)
    private readonly db: Kysely<PaymentDatabase>,
  ) {}

  getTariffs(subscriptionType: SubscriptionTypeName) {
    return this.db
      .selectFrom('tariffs')
      .innerJoin(
        'subscription_types',
        'subscription_types.id',
        'tariffs.subscriptionTypeId',
      )
      .select([
        'tariffs.id',
        'tariffs.name',
        'tariffs.durationDays',
        'tariffs.price',
      ])
      .where('tariffs.deletedAt', 'is', null)
      .where('subscription_types.namePaymentStatus', '=', subscriptionType)
      .orderBy('tariffs.durationDays', 'asc')
      .execute();
  }
}
