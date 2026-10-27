export type PaymentHistoryStatus =
  'pending' | 'succeeded' | 'canceled' | 'failed';

export type SubscriptionHistoryItemContract = {
  id: string;
  date: string;
  paymentDate: string | null;
  subscriptionEndDate: string | null;
  priceInMinorUnits: number;
  currency: 'USD';
  subscriptionName: string;
  subscriptionType: string;
  paymentService: 'STRIPE' | 'YOOKASSA';
  status: PaymentHistoryStatus;
};

export type GetSubscriptionHistoryContract = {
  userId: string;
  page: number;
  pageSize: number;
};

export type SubscriptionHistoryContract = {
  items: SubscriptionHistoryItemContract[];
  totalCount: number;
  page: number;
  pageSize: number;
};
