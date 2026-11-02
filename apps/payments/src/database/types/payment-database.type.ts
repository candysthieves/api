import { Generated, Selectable } from 'kysely';
import type { SubscriptionTypeName } from '@libs/contracts';
import type { PaymentEventTable } from '../../events/payment-event.type.js';

export type { SubscriptionTypeName } from '@libs/contracts';

export type PaymentProvider = 'STRIPE' | 'YOOKASSA';
export type SubscriptionStatus = 'Processing' | 'Done' | 'Failed';
export type PaymentStatus = 'pending' | 'succeeded' | 'canceled' | 'failed';

export interface SubscriptionTypeTable {
  id: number;
  namePaymentStatus: SubscriptionTypeName;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  deletedAt: Date | null;
}

export interface PaymentsTable {
  id: Generated<string>;
  provider: PaymentProvider;
  userId: string;
  externalPaymentId: string | null;
  /** Tariff price in USD cents. */
  amount: number;
  paymentMethodId: string | null;
  tariffId: number;
  paymentDate: Date | null;
  status: PaymentStatus;
  createdAt: Generated<Date>;
}

export interface SubscriptionTable {
  id: Generated<string>;
  userId: string;
  tariffId: number;
  lastPaymentId: string | null;
  provider: PaymentProvider | null;
  status: SubscriptionStatus;
  expirationDate: Date | null;
  nextChargeDate: Date | null;
  createdAt: Generated<Date>;
}

export interface BonusesTable {
  userId: string;
  bonusHours: number;
}

export interface TariffTable {
  id: number;
  name: string;
  subscriptionTypeId: number;
  durationDays: number;
  price: string;
  createdAt: Generated<Date>;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

export interface PaymentDatabase {
  paymentInbox: PaymentEventTable;
  paymentOutbox: PaymentEventTable;
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
