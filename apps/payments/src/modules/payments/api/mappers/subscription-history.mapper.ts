import type { SubscriptionPaymentHistoryItem } from '../../application/types/subscription-payment-history-item.type.js';

type SubscriptionHistoryRow = {
  id: string;
  date: Date;
  paymentDate: Date | null;
  amountMinorUnits: string | null;
  status: SubscriptionPaymentHistoryItem['status'];
  paymentService: SubscriptionPaymentHistoryItem['paymentService'];
  subscriptionName: string | null;
  subscriptionType: string | null;
  subscriptionEndDate: Date | null;
};

export class SubscriptionHistoryMapper {
  static toViews(
    payments: SubscriptionHistoryRow[],
  ): SubscriptionPaymentHistoryItem[] {
    return payments.map((payment) => ({
      id: payment.id,
      date: payment.date,
      paymentDate: payment.paymentDate,
      subscriptionEndDate:
        payment.status === 'succeeded' ? payment.subscriptionEndDate : null,
      price: payment.amountMinorUnits ?? '0',
      subscriptionName: payment.subscriptionName ?? '',
      subscriptionType: payment.subscriptionType ?? '',
      paymentService: payment.paymentService,
      status: payment.status,
    }));
  }
}
