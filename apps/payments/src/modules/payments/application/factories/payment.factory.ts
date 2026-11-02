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
    tariffId: number,
    provider: PaymentProvider,
    externalPaymentId: string | null,
    amount: number,
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
      paymentMethodId: null,
      paymentDate: null,
      status: status,
    };
  }
}
