import type { SubscriptionHistoryItemContract } from '@libs/contracts';
import type { SubscriptionHistoryRow } from '../../infrastructure/repositories/payments/payments.query.repository.js';

export class SubscriptionHistoryMapper {
  static toView(row: SubscriptionHistoryRow): SubscriptionHistoryItemContract {
    const paymentDate =
      row.paymentDateSeconds === null
        ? null
        : new Date(row.paymentDateSeconds * 1000);
    const subscriptionEndDate = paymentDate
      ? new Date(
          paymentDate.getTime() + Math.round(row.durationDays * 86400) * 1000,
        ).toISOString()
      : null;

    return {
      id: row.id,
      date: new Date(row.createdAtSeconds * 1000).toISOString(),
      paymentDate: paymentDate?.toISOString() ?? null,
      subscriptionEndDate,
      priceInMinorUnits: Number(row.amount),
      currency: 'USD',
      subscriptionName: row.subscriptionName,
      subscriptionType: row.subscriptionType,
      paymentService: row.provider,
      status: row.status,
    };
  }
}
