import { Insertable } from 'kysely';
import { randomUUID } from 'node:crypto';
import {
  PaymentProvider,
  PaymentsTable,
  PaymentStatus,
} from '../../../../database/types/payment-database.type.js';

export class PaymentFactory {
  static create(
    userId: string,
    tariffId: string,
    provider: PaymentProvider,
    externalPaymentId: string,
    amount: number,
    currency: string,
    id = randomUUID(),
    status: PaymentStatus = 'pending',
  ): Insertable<PaymentsTable> & { id: string } {
    return {
      id,
      provider,
      tariffId,
      userId,
      externalPaymentId,
      amount,
      currency,
      paymentMethodId: null,
      paymentDate: null,
      status: status,
    };
  }
}
