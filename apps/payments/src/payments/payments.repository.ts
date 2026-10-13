import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY_CLICKHOUSE } from '../database/database.constants.js';
import { PaymentDatabase } from '../database/types/payment-database.type.js';

@Injectable()
export class PaymentsRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE)
    private readonly db: Kysely<PaymentDatabase>,
  ) {}

  getTariffs() {
    return this.db
      .selectFrom('tariffs')
      .select(['id', 'name', 'durationDays', 'priceInMinorUnits'])
      .where('deletedAt', 'is', null)
      .orderBy('durationDays', 'asc')
      .execute();
  }
}
