import { Generated } from 'kysely';

export type PaymentProvider = 'STRIPE' | 'YOOKASSA';
export type SubscriptionTypeName = 'Personal' | 'Business';

export interface SubscriptionTypeTable {
  id: number;
  name_payment_status: SubscriptionTypeName;
  created_at: Generated<string>;
  updated_at: Generated<string>;
  deleted_at: string | null;
}

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
}

export interface PaymentDatabase {
  payments: PaymentsTable;
  subscriptions: SubscriptionTable;
  subscription_types: SubscriptionTypeTable;
  tariffs: TariffTable;
}
