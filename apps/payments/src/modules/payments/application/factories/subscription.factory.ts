import { Insertable } from 'kysely';
import { randomUUID } from 'node:crypto';
import { SubscriptionTable } from '../../../../database/types/payment-database.type.js';

export class SubscriptionFactory {
  static create(
    userId: string,
    tariffId: string,
    lastPaymentId: string,
    expirationDate: Date,
  ): Insertable<SubscriptionTable> & { id: string } {
    return {
      id: randomUUID(),
      userId,
      tariffId,
      lastPaymentId,
      expirationDate,
      cancellationRequestedAt: null,
    };
  }
}
