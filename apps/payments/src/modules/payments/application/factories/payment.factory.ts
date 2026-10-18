import type { Insertable } from 'kysely';
import { randomUUID } from 'node:crypto';
import {
  type PaymentProvider,
  type PaymentsTable,
  type PaymentStatus,
} from '../../../../database/types/payment-database.type.js';

export class PaymentFactory {
  static create(
    userExternalPaymentId: string,
    tariffId: string,
    provider: PaymentProvider,
    status: PaymentStatus = 'pending',
    amountMinorUnits: string | null = null,
    currency: string | null = null,
  ): Insertable<PaymentsTable> & { id: string } {
    return {
      id: randomUUID(),
      provider,
      providerPaymentId: null,
      amountMinorUnits,
      currency,
      tariffId,
      userExternalPaymentId,
      paymentDate: null,
      status,
    };
  }
}
