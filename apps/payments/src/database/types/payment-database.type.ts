import { Generated } from 'kysely';

export type PaymentProvider = 'STRIPE' | 'YOOKASSA';

export interface PaymentsTable {
  id: Generated<string>;
  provider: PaymentProvider;
  created_at: Generated<string>;
}

export interface SubscriptionTable {
  id: Generated<string>;
  created_at: Generated<string>;
}

export interface PaymentDatabase {
  payments: PaymentsTable;
  Subscription: SubscriptionTable;
}
