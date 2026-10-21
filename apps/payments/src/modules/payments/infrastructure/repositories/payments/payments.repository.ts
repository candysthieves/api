import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import { Insertable, Kysely } from 'kysely';
import {
  PaymentDatabase,
  PaymentEntity,
  PaymentsTable,
  PaymentStatus,
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

  async updateExternalPaymentId(
    paymentId: string,
    externalPaymentId: string,
  ): Promise<void> {
    await this.db
      .updateTable('payments')
      .set({ userExternalPaymentId: externalPaymentId })
      .where('id', '=', paymentId)
      .execute();
  }

  async findByExternalPaymentId(
    externalPaymentId: string,
  ): Promise<PaymentEntity | undefined> {
    return this.db
      .selectFrom('payments')
      .selectAll()
      .where('userExternalPaymentId', '=', externalPaymentId)
      .executeTakeFirst();
  }

  async updateStatus(
    paymentId: string,
    status: PaymentStatus,
    paymentDate: Date,
  ): Promise<void> {
    await this.db
      .updateTable('payments')
      .set({ status, paymentDate })
      .where('id', '=', paymentId)
      .execute();
  }
}
