import { Generated } from 'kysely';

export type PaymentProvider = 'STRIPE' | 'YOOKASSA';

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
  price: string;
  createdAt: Generated<Date>;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

export interface PaymentDatabase {
  payments: PaymentsTable;
  subscriptions: SubscriptionTable;
  tariffs: TariffTable;
  bonuses: BonusesTable;
}
