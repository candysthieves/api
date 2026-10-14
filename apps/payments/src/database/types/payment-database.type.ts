import { Generated, Selectable } from 'kysely';

export type PaymentProvider = 'STRIPE' | 'YOOKASSA';
export type SubscriptionTypeName = 'Personal' | 'Business';

export interface SubscriptionTypeTable {
  id: number;
  name_payment_status: SubscriptionTypeName;
  created_at: Generated<string>;
  updated_at: Generated<string>;
  deleted_at: string | null;
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface PaymentsTable {
  id: Generated<string>;
  provider: PaymentProvider;
  userExternalPaymentId: string;
  tariffId: string;
  paymentDate: Date | null;
  status: PaymentStatus;
  createdAt: Generated<Date>;
}

export interface SubscriptionTable {
  id: Generated<string>;
  userId: string;
  lastPaymentId: string;
  expirationDate: Date;
  createdAt: Generated<Date>;
}

export interface BonusesTable {
  userId: string;
  bonusHours: number;
}

export interface TariffTable {
  id: Generated<string>;
  name: string;
  durationDays: number;
  priceInMinorUnits: string;
  createdAt: Generated<Date>;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

export interface PaymentDatabase {
  payments: PaymentsTable;
  subscriptions: SubscriptionTable;
  subscription_types: SubscriptionTypeTable;
  tariffs: TariffTable;
  bonuses: BonusesTable;
}

// Entities (Selectable models for queries and business logic)
export type TariffEntity = Selectable<TariffTable>;
export type PaymentEntity = Selectable<PaymentsTable>;
export type SubscriptionEntity = Selectable<SubscriptionTable>;
export type SubscriptionTypeEntity = Selectable<SubscriptionTypeTable>;
export type BonusEntity = Selectable<BonusesTable>;
