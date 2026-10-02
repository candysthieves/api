import type { Model } from 'mongoose';
import type { StoredEvent } from './schemas/stored-event.schema.js';

export class MongoEventRepository {
  private running = false;
  constructor(protected readonly model: Model<StoredEvent>) {}

  // Добавляет событие, не перезаписывая уже сохранённое.
  protected async insert(
    event: Partial<StoredEvent> & { _id: string },
  ): Promise<void> {
    await this.model
      .updateOne({ _id: event._id }, { $setOnInsert: event }, { upsert: true })
      .exec();
  }

  // Проверяет, что событие всё ещё обрабатывается этой попыткой.
  async isCurrent(event: StoredEvent): Promise<boolean> {
    return Boolean(
      await this.model
        .exists({
          _id: event._id,
          status: 'PROCESSING',
          attempts: event.attempts,
        })
        .exec(),
    );
  }

  async exists(eventId: string): Promise<boolean> {
    return Boolean(await this.model.exists({ _id: eventId }).exec());
  }

  // Обрабатывает ожидающие события, не допуская параллельных запусков.
  async run(
    handle: (event: StoredEvent) => Promise<void>,
    concurrency = 10,
  ): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.findPending(concurrency);
      const results = await Promise.allSettled(
        events.map((event) => this.processEvent(event, handle)),
      );
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;
    } finally {
      this.running = false;
    }
  }

  // Возвращает подходящие события по порядку создания.
  private findPending(concurrency: number): Promise<StoredEvent[]> {
    return this.model
      .find({
        status: 'UNPROCESSED',
        attempts: { $lt: 3 },
        $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: new Date() } }],
      })
      .sort({ createdAt: 1 })
      .limit(concurrency)
      .exec();
  }

  // Захватывает событие и обрабатывает его результат.
  private async processEvent(
    pending: StoredEvent,
    handle: (event: StoredEvent) => Promise<void>,
  ): Promise<void> {
    const event = await this.markAsProcessing(pending);
    if (!event) return;

    try {
      await handle(event);
      await this.complete(event);
    } catch (error) {
      await this.fail(event, error);
    }
  }

  // Атомарно переводит событие в обработку.
  private markAsProcessing(event: StoredEvent): Promise<StoredEvent | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: event._id,
          status: 'UNPROCESSED',
          attempts: event.attempts,
        },
        {
          $set: { status: 'PROCESSING', processingStartedAt: new Date() },
          $inc: { attempts: 1 },
          $unset: { nextAttemptAt: 1 },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  // Помечает событие успешно обработанным.
  private complete(event: StoredEvent): Promise<unknown> {
    return this.model
      .updateOne(this.currentAttemptFilter(event), {
        $set: { status: 'OK', completedAt: new Date() },
        $unset: { processingStartedAt: 1, lastError: 1 },
      })
      .exec();
  }

  // Ставит повтор или завершает событие после третьей ошибки.
  private fail(event: StoredEvent, error: unknown): Promise<unknown> {
    const exhausted = (event.attempts ?? 0) >= 3;
    return this.model
      .updateOne(this.currentAttemptFilter(event), {
        $set: {
          status: exhausted ? 'ERROR' : 'UNPROCESSED',
          ...(exhausted
            ? { completedAt: new Date() }
            : { nextAttemptAt: new Date(Date.now() + 10_000) }),
          lastError: error instanceof Error ? error.message : String(error),
        },
        $unset: { processingStartedAt: 1 },
      })
      .exec();
  }

  // Находит только текущую попытку обработки события.
  private currentAttemptFilter(event: StoredEvent) {
    return {
      _id: event._id,
      status: 'PROCESSING' as const,
      attempts: event.attempts,
    };
  }

  // Восстанавливает все события, зависшие дольше минуты.
  async recover(): Promise<void> {
    const events = await this.model
      .find({
        status: 'PROCESSING',
        processingStartedAt: { $lt: new Date(Date.now() - 60_000) },
      })
      .exec();
    for (const event of events) await this.recoverEvent(event);
  }

  // Возвращает событие в очередь или завершает его после лимита попыток.
  private recoverEvent(event: StoredEvent): Promise<unknown> {
    const exhausted = (event.attempts ?? 0) >= 3;
    return this.model
      .updateOne(
        {
          _id: event._id,
          status: 'PROCESSING',
          attempts: event.attempts,
          processingStartedAt: event.processingStartedAt,
        },
        {
          $set: {
            status: exhausted ? 'ERROR' : 'UNPROCESSED',
            lastError: 'PROCESSING_TIMEOUT',
            ...(exhausted
              ? { completedAt: new Date() }
              : { nextAttemptAt: new Date(Date.now() + 10_000) }),
          },
          $unset: { processingStartedAt: 1 },
        },
      )
      .exec();
  }

  // Очищает содержимое завершённых событий старше часа.
  async cleanup(): Promise<void> {
    await this.model
      .updateMany(
        {
          status: { $in: ['OK', 'ERROR'] },
          completedAt: { $lte: new Date(Date.now() - 3_600_000) },
        },
        {
          $unset: {
            data: 1,
            body: 1,
            consumer: 1,
            type: 1,
            attempts: 1,
            processingStartedAt: 1,
            nextAttemptAt: 1,
            completedAt: 1,
            lastError: 1,
            createdAt: 1,
          },
        },
      )
      .exec();
  }
}
