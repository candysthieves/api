import type { SubscriptionPaymentHistoryItem } from '../../application/types/subscription-payment-history-item.type.js';
import { SubscriptionHistoryItemViewType } from '../view-types/subscription-history-item-view.type.js';

export class SubscriptionHistoryMapper {
  static toViews(
    payments: SubscriptionPaymentHistoryItem[],
  ): SubscriptionHistoryItemViewType[] {
    return payments.map((payment) => ({
      id: payment.id,
      date: new Date(payment.date).toISOString(),
      paymentDate: payment.paymentDate
        ? new Date(payment.paymentDate).toISOString()
        : null,
      subscriptionEndDate: payment.subscriptionEndDate
        ? new Date(payment.subscriptionEndDate).toISOString()
        : null,
      price: Number(payment.price),
      subscriptionName: payment.subscriptionName,
      subscriptionType: payment.subscriptionType,
      paymentService: payment.paymentService,
      status: payment.status,
    }));
  }
}
