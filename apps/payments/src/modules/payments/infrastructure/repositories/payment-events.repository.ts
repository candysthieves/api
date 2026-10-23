import { createHash } from 'node:crypto';
import { inspect } from 'node:util';
import { Inject, Injectable } from '@nestjs/common';
import { type Kysely, sql } from 'kysely';
import type { PaymentStatusChangedEvent } from '@libs/contracts';
import { KYSELY_CLICKHOUSE } from '../../../../database/database.constants.js';
import type {
  PaymentDatabase,
  PaymentEventStatus,
  PaymentInboxTable,
} from '../../../../database/types/payment-database.type.js';
import type { YooKassaNotificationInboxEvent } from './payment-events/types/yookassa-notification-inbox-event.type.js';
import type { EventTableName } from './payment-events/types/event-table-name.type.js';

@Injectable()
export class PaymentEventsRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE)
    private readonly clickHouseDb: Kysely<PaymentDatabase>,
  ) {}

  /**
   * Сохраняет уведомление YooKassa в payment_inbox до обработки.
   * Если такой eventId уже есть, повторная доставка не добавляет вторую запись.
   */
  async acceptNotification(
    yooKassaNotification: YooKassaNotificationInboxEvent,
  ): Promise<void> {
    await this.insertIfMissing(
      'payment_inbox',
      yooKassaNotification.eventId,
      yooKassaNotification.type,
      yooKassaNotification.data,
    );
  }

  /**
   * Создаёт событие об изменении платежа для main и кладёт его в payment_outbox.
   * ID зависит от пары paymentId/status, поэтому повторный вызов не создаёт новое событие.
   */
  async enqueueStatus(
    paymentId: string,
    status: PaymentStatusChangedEvent['data']['status'],
  ): Promise<void> {
    const eventId = stableUuid(`${paymentId}:${status}`);
    const paymentStatusEvent: PaymentStatusChangedEvent = {
      eventId,
      consumer: 'MAIN',
      type: 'payment.status.changed',
      data: { paymentId, status, occurredAt: new Date().toISOString() },
    };
    await this.insertIfMissing(
      'payment_outbox',
      eventId,
      paymentStatusEvent.type,
      paymentStatusEvent,
    );
  }

  /**
   * Находит до 10 событий, готовых к обработке: UNPROCESSED, менее трёх попыток,
   * без задержки повтора или с уже наступившим nextAttemptAt. Сначала идут старые.
   */
  async findPending(eventTable: EventTableName): Promise<PaymentInboxTable[]> {
    return await this.clickHouseDb
      .selectFrom(eventTable)
      .selectAll()
      .where('status', '=', 'UNPROCESSED')
      .where('attempts', '<', 3)
      .where((expressionBuilder) =>
        expressionBuilder.or([
          expressionBuilder('nextAttemptAt', 'is', null),
          expressionBuilder('nextAttemptAt', '<=', new Date()),
        ]),
      )
      .orderBy('createdAt', 'asc')
      .limit(10)
      .execute();
  }

  /**
   * Пытается захватить событие: меняет UNPROCESSED на PROCESSING,
   * увеличивает attempts и сбрасывает время следующего повтора.
   * Результат UPDATE не проверяется, поэтому метод не сообщает, удалось ли захватить строку.
   */
  async claim(
    eventTable: EventTableName,
    pendingEvent: PaymentInboxTable,
  ): Promise<void> {
    await this.clickHouseDb
      .updateTable(eventTable)
      .set({
        status: 'PROCESSING',
        attempts: pendingEvent.attempts + 1,
        processingStartedAt: new Date(),
        nextAttemptAt: null,
      })
      .where('eventId', '=', pendingEvent.eventId)
      .where('status', '=', 'UNPROCESSED')
      .execute();
  }

  /**
   * Сохраняет результат попытки обработки. Успех переводит запись в OK;
   * ошибка возвращает её в очередь через 10 секунд, а после третьей попытки ставит ERROR.
   */
  async finish(
    eventTable: EventTableName,
    eventId: string,
    attemptCount: number,
    processingError?: unknown,
  ): Promise<void> {
    const hasError = processingError !== undefined;
    const attemptsExhausted = hasError && attemptCount >= 3;
    const resultingStatus = !hasError
      ? 'OK'
      : attemptsExhausted
        ? 'ERROR'
        : 'UNPROCESSED';
    await this.clickHouseDb
      .updateTable(eventTable)
      .set({
        status: resultingStatus,
        processingStartedAt: null,
        nextAttemptAt:
          resultingStatus === 'UNPROCESSED'
            ? new Date(Date.now() + 10_000)
            : null,
        completedAt: resultingStatus === 'UNPROCESSED' ? null : new Date(),
        lastError: hasError
          ? processingError instanceof Error
            ? processingError.message
            : inspect(processingError)
          : null,
      })
      .where('eventId', '=', eventId)
      .where('status', '=', 'PROCESSING')
      .where('attempts', '=', attemptCount)
      .execute();
  }

  /**
   * Выбирает ожидающие записи outbox, разбирает сохранённый JSON
   * в контракт события и передаёт его функции публикации в RabbitMQ.
   */
  async publishPending(
    publishEvent: (
      paymentStatusEvent: PaymentStatusChangedEvent,
    ) => Promise<void>,
  ): Promise<void> {
    await this.processPending('payment_outbox', (eventRow) =>
      publishEvent(JSON.parse(eventRow.data) as PaymentStatusChangedEvent),
    );
  }

  /**
   * Обрабатывает входящие уведомления YooKassa: извлекает providerPaymentId
   * из сохранённого JSON и передаёт его use case для проверки платежа.
   */
  async processPendingNotifications(
    processNotification: (providerPaymentId: string) => Promise<void>,
  ): Promise<void> {
    await this.processPending('payment_inbox', (eventRow) => {
      const { providerPaymentId } = JSON.parse(eventRow.data) as {
        providerPaymentId: string;
      };
      return processNotification(providerPaymentId);
    });
  }

  /**
   * Возвращает в очередь события, застрявшие в PROCESSING больше минуты.
   * Если уже использованы три попытки, завершает событие статусом ERROR.
   */
  async recover(): Promise<void> {
    const staleBefore = new Date(Date.now() - 60_000);
    for (const eventTable of ['payment_inbox', 'payment_outbox'] as const) {
      await this.clickHouseDb
        .updateTable(eventTable)
        .set({
          status: sql<PaymentEventStatus>`if(attempts >= 3, 'ERROR', 'UNPROCESSED')`,
          nextAttemptAt: sql<Date | null>`if(attempts >= 3, NULL, now() + INTERVAL 10 SECOND)`,
          processingStartedAt: null,
          completedAt: sql<Date | null>`if(attempts >= 3, now(), NULL)`,
          lastError: 'PROCESSING_TIMEOUT',
        })
        .where('status', '=', 'PROCESSING')
        .where('processingStartedAt', '<', staleBefore)
        .execute();
    }
  }

  /**
   * Через час после завершения очищает payload и технические поля записей OK/ERROR.
   * eventId и статус сохраняются, чтобы распознать повторную доставку события.
   */
  async cleanup(): Promise<void> {
    for (const eventTable of ['payment_inbox', 'payment_outbox'] as const) {
      await this.clickHouseDb
        .updateTable(eventTable)
        .set({
          type: '',
          data: '',
          attempts: 0,
          processingStartedAt: null,
          nextAttemptAt: null,
          completedAt: null,
          lastError: null,
        })
        .where('status', 'in', ['OK', 'ERROR'])
        .where('completedAt', '<=', new Date(Date.now() - 3_600_000))
        .execute();
    }
  }

  /**
   * Ищет запись с таким eventId и, если её нет, вставляет новую.
   * Проверка и вставка выполняются отдельными запросами.
   */
  private async insertIfMissing(
    eventTable: EventTableName,
    eventId: string,
    eventType: string,
    eventPayload: unknown,
  ): Promise<void> {
    const existingEvent = await this.clickHouseDb
      .selectFrom(eventTable)
      .select('eventId')
      .where('eventId', '=', eventId)
      .executeTakeFirst();
    if (existingEvent) return;

    await this.clickHouseDb
      .insertInto(eventTable)
      .values(this.newEventRow(eventId, eventType, eventPayload))
      .execute();
  }

  /**
   * Общий цикл для inbox и outbox: выбирает события, отмечает попытку,
   * вызывает переданный обработчик и сохраняет успех либо ошибку.
   * Ошибка обработчика записывается в событие и не прерывает обработку остальных строк.
   */
  private async processPending(
    eventTable: EventTableName,
    processEvent: (eventRow: PaymentInboxTable) => Promise<void>,
  ): Promise<void> {
    const pendingEvents = await this.findPending(eventTable);
    await Promise.all(
      pendingEvents.map(async (pendingEvent) => {
        await this.claim(eventTable, pendingEvent);
        const attemptCount = pendingEvent.attempts + 1;
        try {
          await processEvent(pendingEvent);
          await this.finish(eventTable, pendingEvent.eventId, attemptCount);
        } catch (processingError) {
          await this.finish(
            eventTable,
            pendingEvent.eventId,
            attemptCount,
            processingError,
          );
        }
      }),
    );
  }

  /**
   * Создаёт начальную строку очереди: сериализует payload и выставляет
   * UNPROCESSED, нулевой счётчик попыток и пустые поля обработки.
   */
  private newEventRow(
    eventId: string,
    eventType: string,
    eventPayload: unknown,
  ) {
    return {
      eventId,
      type: eventType,
      data: JSON.stringify(eventPayload),
      status: 'UNPROCESSED' as const,
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      processingStartedAt: null,
      nextAttemptAt: null,
      completedAt: null,
      lastError: null,
    };
  }
}

/**
 * Получает повторяемый UUID-совместимый ID из входной строки.
 * Это не UUID v5 по RFC: используется SHA-256, затем выставляются биты версии/варианта,
 * чтобы ID проходил формат UUID и оставался одинаковым для одного и того же значения.
 */
function stableUuid(eventKey: string): string {
  const hash = createHash('sha256').update(eventKey).digest('hex').slice(0, 32);
  const variant = ((parseInt(hash.charAt(16), 16) & 3) | 8).toString(16);
  const versionedHash =
    hash.slice(0, 12) + '5' + hash.slice(13, 16) + variant + hash.slice(17);

  return `${versionedHash.slice(0, 8)}-${versionedHash.slice(8, 12)}-${versionedHash.slice(12, 16)}-${versionedHash.slice(16, 20)}-${versionedHash.slice(20)}`;
}
