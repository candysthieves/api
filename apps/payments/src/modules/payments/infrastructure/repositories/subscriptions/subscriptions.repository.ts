import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import { PaymentDatabase } from '../../../../../database/types/payment-database.type.js';
import { clickhouseDateTime } from './clickhouse-datetime.js';
import type { ActivateSubscriptionInput } from './types/activate-subscription-input.type.js';

@Injectable()
export class SubscriptionsRepository {
  /** Подключает репозиторий к базе платежей. */
  constructor(
    @Inject(KYSELY_CLICKHOUSE) private readonly db: Kysely<PaymentDatabase>,
  ) {}

  /** Фиксирует запрос на отмену и отключает следующее списание. */
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

  /** Обновляет подписку после успешной оплаты. */
  async updateFromSuccessfulPayment(
    subscriptionId: string,
    input: ActivateSubscriptionInput,
  ): Promise<void> {
    await this.db
      .updateTable('subscriptions')
      .set({
        tariffId: input.tariffId,
        lastPaymentId: input.paymentId,
        paymentMethodId: input.paymentMethodId,
        expirationDate: clickhouseDateTime(input.expirationDate),
        nextChargeDate: input.nextChargeDate
          ? clickhouseDateTime(input.nextChargeDate)
          : null,
      })
      .where('id', '=', subscriptionId)
      .execute();
  }

  /** Создаёт подписку после первой успешной оплаты. */
  async createFromSuccessfulPayment(
    input: ActivateSubscriptionInput,
  ): Promise<void> {
    await this.db
      .insertInto('subscriptions')
      .values({
        id: randomUUID(),
        userId: input.userId,
        tariffId: input.tariffId,
        lastPaymentId: input.paymentId,
        paymentMethodId: input.paymentMethodId,
        expirationDate: clickhouseDateTime(input.expirationDate),
        nextChargeDate: input.nextChargeDate
          ? clickhouseDateTime(input.nextChargeDate)
          : null,
        cancellationRequestedAt: null,
      })
      .execute();
  }

  /** Обновляет срок подписки и дату следующего списания после продления. */
  async markRenewalSucceeded(
    subscriptionId: string,
    paymentId: string,
    expirationDate: Date,
  ): Promise<void> {
    await this.db
      .updateTable('subscriptions')
      .set({
        lastPaymentId: paymentId,
        expirationDate: clickhouseDateTime(expirationDate),
        nextChargeDate: clickhouseDateTime(expirationDate),
      })
      .where('id', '=', subscriptionId)
      .where('cancellationRequestedAt', 'is', null)
      .execute();
  }

  /** Останавливает новые списания после неудачи, сохраняя оплаченный срок. */
  async markRenewalFailed(subscriptionId: string): Promise<void> {
    await this.db
      .updateTable('subscriptions')
      .set({ nextChargeDate: null })
      .where('id', '=', subscriptionId)
      .where('cancellationRequestedAt', 'is', null)
      .execute();
  }
}
