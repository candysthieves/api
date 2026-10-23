import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import {
  PaymentDatabase,
  SubscriptionEntity,
} from '../../../../../database/types/payment-database.type.js';
import { clickhouseDateTime } from './clickhouse-datetime.js';

@Injectable()
export class SubscriptionsQueryRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE) private readonly db: Kysely<PaymentDatabase>,
  ) {}

  /** Находит действующую подписку пользователя, для которой не запрошена отмена. */
  findActiveSubscription(userId: string, at: Date) {
    return this.db
      .selectFrom('subscriptions')
      .select('id')
      .where('userId', '=', userId)
      .where('expirationDate', '>', clickhouseDateTime(at))
      .where('cancellationRequestedAt', 'is', null)
      .orderBy('expirationDate', 'desc')
      .executeTakeFirst();
  }

  /** Находит подписку по ID последнего платежа. */
  findByPaymentId(paymentId: string) {
    return this.db
      .selectFrom('subscriptions')
      .select('id')
      .where('lastPaymentId', '=', paymentId)
      .executeTakeFirst();
  }

  /** Возвращает подписки, для которых уже наступила дата автопродления. */
  findDueForRenewal(at: Date, limit: number): Promise<SubscriptionEntity[]> {
    return this.db
      .selectFrom('subscriptions')
      .innerJoin('payments', 'payments.id', 'subscriptions.lastPaymentId')
      .selectAll('subscriptions')
      .where('payments.provider', '=', 'YOOKASSA')
      .where('subscriptions.cancellationRequestedAt', 'is', null)
      .where('subscriptions.paymentMethodId', 'is not', null)
      .where('subscriptions.nextChargeDate', '<=', clickhouseDateTime(at))
      .orderBy('subscriptions.nextChargeDate', 'asc')
      .limit(limit)
      .execute();
  }

  /** Находит подписку по её ID. */
  findById(subscriptionId: string): Promise<SubscriptionEntity | undefined> {
    return this.db
      .selectFrom('subscriptions')
      .selectAll()
      .where('id', '=', subscriptionId)
      .executeTakeFirst();
  }

  /** Возвращает даты текущей подписки и учитывает правило следующего списания для Stripe. */
  async findCurrentSubscription(userId: string, at: Date) {
    const subscription = await this.db
      .selectFrom('subscriptions')
      .innerJoin('payments', 'payments.id', 'subscriptions.lastPaymentId')
      .select([
        'subscriptions.expirationDate',
        'subscriptions.nextChargeDate',
        'subscriptions.cancellationRequestedAt',
        'payments.provider',
      ])
      .where('subscriptions.userId', '=', userId)
      .where('subscriptions.expirationDate', '>', clickhouseDateTime(at))
      .orderBy('subscriptions.expirationDate', 'desc')
      .executeTakeFirst();
    if (!subscription) return undefined;

    const nextChargeDate =
      subscription.nextChargeDate ??
      (subscription.provider === 'STRIPE' &&
      !subscription.cancellationRequestedAt
        ? subscription.expirationDate
        : null);

    return {
      expirationDate: subscription.expirationDate,
      nextChargeDate,
    };
  }
}
