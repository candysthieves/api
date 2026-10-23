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
    // TODO: Discuss with the tech lead how to handle INSERT parameter processing in the Kysely ClickHouse adapter.
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

  findHistoryByUserId(userId: string) {
    return this.db
      .selectFrom('payments')
      .leftJoin('tariffs', 'tariffs.id', 'payments.tariffId')
      .leftJoin(
        'subscription_types',
        'subscription_types.id',
        'tariffs.subscriptionTypeId',
      )
      .leftJoin('subscriptions', 'subscriptions.lastPaymentId', 'payments.id')
      .select([
        'payments.id as id',
        'payments.createdAt as date',
        'payments.paymentDate as paymentDate',
        'payments.amountMinorUnits as amountMinorUnits',
        'payments.status as status',
        'payments.provider as paymentService',
        'tariffs.name as subscriptionName',
        'subscription_types.namePaymentStatus as subscriptionType',
        'subscriptions.expirationDate as subscriptionEndDate',
      ])
      .where('payments.userExternalPaymentId', '=', userId)
      .orderBy('payments.createdAt', 'desc')
      .execute();
  }
}
