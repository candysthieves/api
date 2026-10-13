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

export interface TariffTable {
  id: Generated<string>;
  name: string;
  duration_days: number;
  price: string;
  created_at: Generated<string>;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface PaymentDatabase {
  payments: PaymentsTable;
  subscriptions: SubscriptionTable;
  tariffs: TariffTable;
}
