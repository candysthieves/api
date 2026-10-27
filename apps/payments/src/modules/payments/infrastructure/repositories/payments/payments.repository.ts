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

  findById(id: string): Promise<PaymentEntity | undefined> {
    return this.db
      .selectFrom('payments')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async addExternalPaymentId(
    id: string,
    externalPaymentId: string,
  ): Promise<void> {
    await executeMutation(
      this.db,
      this.db
        .updateTable('payments')
        .set({ externalPaymentId })
        .where('id', '=', id)
        .modifyEnd(sql`SETTINGS mutations_sync = 1`),
    );
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
    paymentDate: Date | null,
  ): Promise<void> {
    await executeMutation(
      this.db,
      this.db
        .updateTable('payments')
        .set({
          status,
          paymentMethodId: paymentMethodId ?? sql`NULL`,
          paymentDate: paymentDate
            ? sql<Date>`parseDateTimeBestEffort(${paymentDate.toISOString()})`
            : sql`NULL`,
        })
        .where('id', '=', id)
        .where(
          'status',
          'in',
          status === 'succeeded'
            ? ['pending', 'canceled', 'failed']
            : ['pending'],
        )
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
