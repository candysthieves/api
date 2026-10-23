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
  createdAt: Generated<Date>;
}

export type PaymentEventStatus = 'UNPROCESSED' | 'PROCESSING' | 'OK' | 'ERROR';

export interface PaymentInboxTable {
  eventId: string;
  type: string;
  data: string;
  status: PaymentEventStatus;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  processingStartedAt: Date | null;
  nextAttemptAt: Date | null;
  completedAt: Date | null;
  lastError: string | null;
}

export type PaymentOutboxTable = PaymentInboxTable;

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
  payment_inbox: PaymentInboxTable;
  payment_outbox: PaymentOutboxTable;
}

// Entities (Selectable models for queries and business logic)
export type TariffEntity = Selectable<TariffTable>;
export type PaymentEntity = Selectable<PaymentsTable>;
export type SubscriptionEntity = Selectable<SubscriptionTable>;
export type SubscriptionTypeEntity = Selectable<SubscriptionTypeTable>;
