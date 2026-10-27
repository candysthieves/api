import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import type {
  PaymentDatabase,
  PaymentProvider,
  PaymentStatus,
} from '../../../../../database/types/payment-database.type.js';

export type SubscriptionHistoryRow = {
  id: string;
  createdAtSeconds: number;
  paymentDateSeconds: number | null;
  amount: number | string;
  provider: PaymentProvider;
  status: PaymentStatus;
  subscriptionName: string;
  subscriptionType: string;
  durationDays: number;
};

@Injectable()
export class PaymentsQueryRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE)
    private readonly db: Kysely<PaymentDatabase>,
  ) {}

  async findHistory(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: SubscriptionHistoryRow[]; totalCount: number }> {
    const query = this.db
      .selectFrom('payments')
      .innerJoin('tariffs', 'tariffs.id', 'payments.tariffId')
      .innerJoin(
        'subscription_types',
        'subscription_types.id',
        'tariffs.subscriptionTypeId',
      )
      .where('payments.userId', '=', userId);

    const [items, count] = await Promise.all([
      query
        .select([
          'payments.id as id',
          sql<number>`toUnixTimestamp(${sql.ref('payments.createdAt')})`.as(
            'createdAtSeconds',
          ),
          sql<
            number | null
          >`toUnixTimestamp(${sql.ref('payments.paymentDate')})`.as(
            'paymentDateSeconds',
          ),
          'payments.amount as amount',
          'payments.provider as provider',
          'payments.status as status',
          'tariffs.name as subscriptionName',
          'tariffs.durationDays as durationDays',
          'subscription_types.namePaymentStatus as subscriptionType',
        ])
        .orderBy('payments.createdAt', 'desc')
        .orderBy('payments.id', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute(),
      query
        .select(sql<number | string>`count(*)`.as('totalCount'))
        .executeTakeFirstOrThrow(),
    ]);

    return { items, totalCount: Number(count.totalCount) };
  }
}
