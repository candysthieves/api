import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import { sql, type Insertable, type Kysely } from 'kysely';
import { executeMutation } from '../../../../../database/execute-mutation.js';
import type {
  PaymentDatabase,
  PaymentEntity,
  PaymentsTable,
} from '../../../../../database/types/payment-database.type.js';

@Injectable()
export class PaymentsRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE)
    private readonly db: Kysely<PaymentDatabase>,
  ) {}

  async create(payment: Insertable<PaymentsTable>): Promise<void> {
    await this.db.insertInto('payments').values(payment).execute();
  }

  findByExternalPaymentId(
    externalPaymentId: string,
  ): Promise<PaymentEntity | undefined> {
    return this.db
      .selectFrom('payments')
      .selectAll()
      .where('provider', '=', 'YOOKASSA')
      .where('externalPaymentId', '=', externalPaymentId)
      .executeTakeFirst();
  }

  async updateStatus(
    id: string,
    status: 'succeeded' | 'canceled',
    paymentMethodId: string | null,
  ): Promise<void> {
    await executeMutation(
      this.db,
      this.db
        .updateTable('payments')
        .set({
          status,
          paymentMethodId: paymentMethodId ?? sql`NULL`,
          paymentDate: status === 'succeeded' ? sql`now()` : sql`NULL`,
        })
        .where('id', '=', id)
        .where('status', '=', 'pending')
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
  }

  findExpired(): Promise<PaymentEntity[]> {
    return this.db
      .selectFrom('payments')
      .selectAll()
      .where('provider', '=', 'YOOKASSA')
      .where('status', '=', 'pending')
      .where('createdAt', '<=', sql<Date>`now() - INTERVAL 15 MINUTE`)
      .execute();
  }
}
