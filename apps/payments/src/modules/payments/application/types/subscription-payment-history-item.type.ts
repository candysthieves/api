import type { PaymentProvider, PaymentStatus } from '@libs/contracts';

export type SubscriptionPaymentHistoryItem = {
  id: string;
  date: Date;
  paymentDate: Date | null;
  subscriptionEndDate: Date | null;
  price: string;
  subscriptionName: string;
  subscriptionType: string;
  paymentService: PaymentProvider;
  status: PaymentStatus;
};
