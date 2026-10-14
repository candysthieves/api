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
}
