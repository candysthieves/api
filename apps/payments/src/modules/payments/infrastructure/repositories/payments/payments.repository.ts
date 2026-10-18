import { Inject, Injectable } from '@nestjs/common';
import { sql, type Insertable, type Kysely } from 'kysely';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import {
  PaymentDatabase,
  PaymentEntity,
  PaymentsTable,
} from '../../../../../database/types/payment-database.type.js';

@Injectable()
export class PaymentsRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE) private readonly db: Kysely<PaymentDatabase>,
  ) {}

  async create(payment: Insertable<PaymentsTable>): Promise<void> {
    await this.db.insertInto('payments').values(payment).execute();
  }

  findById(paymentId: string): Promise<PaymentEntity | undefined> {
    return this.db
      .selectFrom('payments')
      .selectAll()
      .where('id', '=', paymentId)
      .executeTakeFirst();
  }

  findByProviderPaymentId(
    providerPaymentId: string,
  ): Promise<PaymentEntity | undefined> {
    return this.db
      .selectFrom('payments')
      .selectAll()
      .where('providerPaymentId', '=', providerPaymentId)
      .executeTakeFirst();
  }

  async setProviderPaymentId(
    paymentId: string,
    providerPaymentId: string,
  ): Promise<void> {
    await this.db
      .updateTable('payments')
      .set({ providerPaymentId })
      .where('id', '=', paymentId)
      .execute();
  }

  async confirmPayment(paymentId: string, paidAt: Date): Promise<void> {
    await this.db
      .updateTable('payments')
      .set({
        status: 'succeeded',
        paymentDate: sql<Date>`parseDateTimeBestEffort(${paidAt.toISOString()})`,
      })
      .where('id', '=', paymentId)
      .where('status', '=', 'pending')
      .execute();
  }

  async failPayment(paymentId: string): Promise<void> {
    await this.db
      .updateTable('payments')
      .set({ status: 'failed' })
      .where('id', '=', paymentId)
      .where('status', '=', 'pending')
      .execute();
  }
}
