import { Generated, Selectable } from 'kysely';
import type { PaymentProvider, SubscriptionTypeName } from '@libs/contracts';

export type { PaymentProvider, SubscriptionTypeName };

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

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
  providerPaymentId: string | null;
  amountMinorUnits: string | null;
  currency: string | null;
  userExternalPaymentId: string;
  tariffId: string;
  paymentDate: Date | null;
  status: PaymentStatus;
  createdAt: Generated<Date>;
}

export interface SubscriptionTable {
  id: Generated<string>;
  userId: string;
  tariffId: string;
  lastPaymentId: string;
  expirationDate: Date;
  cancellationRequestedAt: Date | null;
  paymentMethodId: string | null;
  nextChargeDate: Date | null;
  retryCount: number;
  lastRenewalAttemptKey: string | null;
  createdAt: Generated<Date>;
}

export type SubscriptionNotificationKind =
  'RENEWAL_RETRY_SCHEDULED' | 'SUBSCRIPTION_ENDED_AFTER_RETRY';

export interface SubscriptionNotificationsTable {
  id: string;
  userId: string;
  kind: SubscriptionNotificationKind;
  createdAt: Date;
  deliveredAt: Date | null;
}

export interface BonusesTable {
  userId: string;
  bonusHours: number;
}

export interface TariffTable {
  id: Generated<string>;
  name: string;
  subscriptionTypeId: number;
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
  subscription_notifications: SubscriptionNotificationsTable;
}

// Entities (Selectable models for queries and business logic)
export type TariffEntity = Selectable<TariffTable>;
export type PaymentEntity = Selectable<PaymentsTable>;
export type SubscriptionEntity = Selectable<SubscriptionTable>;
export type SubscriptionTypeEntity = Selectable<SubscriptionTypeTable>;
export type BonusEntity = Selectable<BonusesTable>;
export type SubscriptionNotificationEntity =
  Selectable<SubscriptionNotificationsTable>;
