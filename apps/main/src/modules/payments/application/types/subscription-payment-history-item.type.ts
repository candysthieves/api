export type SubscriptionPaymentHistoryItem = {
  id: string;
  date: Date | string;
  paymentDate: Date | string | null;
  subscriptionEndDate: Date | string | null;
  price: number | string;
  subscriptionName: string;
  subscriptionType: string;
  paymentService: 'STRIPE' | 'YOOKASSA';
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
};
