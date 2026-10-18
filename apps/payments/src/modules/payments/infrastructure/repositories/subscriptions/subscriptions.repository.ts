import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import {
  PaymentDatabase,
  SubscriptionEntity,
} from '../../../../../database/types/payment-database.type.js';

function clickhouseDateTime(value: Date) {
  return sql<Date>`parseDateTimeBestEffort(${value.toISOString()})`;
}

export type ActivateSubscriptionInput = {
  userId: string;
  tariffId: string;
  paymentId: string;
  paymentMethodId: string | null;
  expirationDate: Date;
  nextChargeDate: Date | null;
};

@Injectable()
export class SubscriptionsRepository {
  /** Подключает репозиторий к базе платежей. */
  constructor(
    @Inject(KYSELY_CLICKHOUSE) private readonly db: Kysely<PaymentDatabase>,
  ) {}

  /** Находит активную подписку пользователя, для которой не запрошена отмена. */
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

  /** Отмечает подписку отменённой и отключает следующее списание. */
  async requestCancellation(subscriptionId: string, requestedAt: Date) {
    await this.db
      .updateTable('subscriptions')
      .set({
        cancellationRequestedAt: clickhouseDateTime(requestedAt),
        nextChargeDate: null,
      })
      .where('id', '=', subscriptionId)
      .where('cancellationRequestedAt', 'is', null)
      .execute();
  }

  /** Активирует подписку после успешной оплаты, игнорируя повторную обработку платежа. */
  async activateFromSuccessfulPayment(
    input: ActivateSubscriptionInput,
  ): Promise<void> {
    const alreadyActivated = await this.db
      .selectFrom('subscriptions')
      .select('id')
      .where('lastPaymentId', '=', input.paymentId)
      .executeTakeFirst();
    if (alreadyActivated) return;

    const values = {
      tariffId: input.tariffId,
      lastPaymentId: input.paymentId,
      paymentMethodId: input.paymentMethodId,
      expirationDate: clickhouseDateTime(input.expirationDate),
      nextChargeDate: input.nextChargeDate
        ? clickhouseDateTime(input.nextChargeDate)
        : null,
      retryCount: 0,
      lastRenewalAttemptKey: null,
    };

    const current = await this.db
      .selectFrom('subscriptions')
      .select('id')
      .where('userId', '=', input.userId)
      .where('expirationDate', '>', clickhouseDateTime(new Date()))
      .where('cancellationRequestedAt', 'is', null)
      .orderBy('expirationDate', 'desc')
      .executeTakeFirst();
    if (current) {
      await this.db
        .updateTable('subscriptions')
        .set(values)
        .where('id', '=', current.id)
        .execute();
      return;
    }
    await this.db
      .insertInto('subscriptions')
      .values({
        id: randomUUID(),
        userId: input.userId,
        ...values,
        cancellationRequestedAt: null,
      })
      .execute();
  }

  /** Находит подписки YooKassa, для которых наступил срок продления. */
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

  /** Запланирует единственную повторную попытку списания для подписки. */
  async scheduleRetry(
    subscriptionId: string,
    retryAt: Date,
    attemptKey: string,
  ): Promise<void> {
    await this.db
      .updateTable('subscriptions')
      .set({
        nextChargeDate: clickhouseDateTime(retryAt),
        expirationDate: clickhouseDateTime(retryAt),
        retryCount: 1,
        lastRenewalAttemptKey: attemptKey,
      })
      .where('id', '=', subscriptionId)
      .where('retryCount', '=', 0)
      .where('cancellationRequestedAt', 'is', null)
      .execute();
  }

  /** Проверяет, что подписка не отменена, и сохраняет ключ текущей попытки продления. */
  async prepareRenewalAttempt(
    subscriptionId: string,
    attemptKey: string,
  ): Promise<boolean> {
    const subscription = await this.db
      .selectFrom('subscriptions')
      .select(['cancellationRequestedAt', 'lastRenewalAttemptKey'])
      .where('id', '=', subscriptionId)
      .executeTakeFirst();
    if (!subscription || subscription.cancellationRequestedAt) return false;
    if (subscription.lastRenewalAttemptKey === attemptKey) return true;

    await this.db
      .updateTable('subscriptions')
      .set({ lastRenewalAttemptKey: attemptKey })
      .where('id', '=', subscriptionId)
      .where('cancellationRequestedAt', 'is', null)
      .execute();
    return true;
  }

  /** Ищет подписку по внутреннему ID. */
  findById(subscriptionId: string): Promise<SubscriptionEntity | undefined> {
    return this.db
      .selectFrom('subscriptions')
      .selectAll()
      .where('id', '=', subscriptionId)
      .executeTakeFirst();
  }

  /** Завершает подписку после неудачной повторной попытки списания. */
  async endAfterFailedRetry(
    subscriptionId: string,
    endedAt: Date,
  ): Promise<void> {
    await this.db
      .updateTable('subscriptions')
      .set({
        expirationDate: clickhouseDateTime(endedAt),
        nextChargeDate: null,
        paymentMethodId: null,
      })
      .where('id', '=', subscriptionId)
      .where('retryCount', '=', 1)
      .where('cancellationRequestedAt', 'is', null)
      .execute();
  }

  /** Сохраняет успешное продление и рассчитывает даты следующего периода. */
  async markRenewalSucceeded(
    subscriptionId: string,
    paymentId: string,
    paidAt: Date,
    durationDays: number,
  ): Promise<void> {
    const expirationDate = new Date(
      paidAt.getTime() + durationDays * 86_400_000,
    );
    await this.db
      .updateTable('subscriptions')
      .set({
        lastPaymentId: paymentId,
        expirationDate: clickhouseDateTime(expirationDate),
        nextChargeDate: clickhouseDateTime(expirationDate),
        retryCount: 0,
        lastRenewalAttemptKey: null,
      })
      .where('id', '=', subscriptionId)
      .where('cancellationRequestedAt', 'is', null)
      .execute();
  }

  /** Возвращает активную подписку и дату следующего списания с учётом провайдера. */
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
