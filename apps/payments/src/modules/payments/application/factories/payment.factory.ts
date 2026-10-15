import { Insertable } from 'kysely';
import { randomUUID } from 'node:crypto';
import {
  PaymentProvider,
  PaymentsTable,
  PaymentStatus,
} from '../../../../database/types/payment-database.type.js';

export class PaymentFactory {
  static create(
    userExternalPaymentId: string,
    tariffId: string,
    provider: PaymentProvider,
    status: PaymentStatus = 'pending',
  ): Insertable<PaymentsTable> & { id: string } {
    return {
      id: randomUUID(),
      provider,
      tariffId,
      userExternalPaymentId,
      paymentDate: null,
      status: status,
    };
  }
}
