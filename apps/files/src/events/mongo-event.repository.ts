import type { Model } from 'mongoose';
import type { StoredEvent } from './schemas/stored-event.schema.js';

export class MongoEventRepository {
  private running = false;
  constructor(protected readonly model: Model<StoredEvent>) {}

  async exists(eventId: string): Promise<boolean> {
    return Boolean(await this.model.exists({ _id: eventId }).exec());
  }

  protected async insert(
    event: Partial<StoredEvent> & { _id: string },
  ): Promise<void> {
    try {
      await this.model
        .updateOne(
          { _id: event._id },
          { $setOnInsert: event },
          { upsert: true },
        )
        .exec();
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 11000 &&
        (await this.exists(event._id))
      ))
        throw error;
    }
  }

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

  async run(handle: (event: StoredEvent) => Promise<void>): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.model
        .find({
          status: 'UNPROCESSED',
          attempts: { $lt: 3 },
          $or: [
            { nextAttemptAt: null },
            { nextAttemptAt: { $lte: new Date() } },
          ],
        })
        .sort({ createdAt: 1 })
        .limit(10)
        .exec();
      const results = await Promise.allSettled(
        events.map(async (pending) => {
          const event = await this.model
            .findOneAndUpdate(
              {
                _id: pending._id,
                status: 'UNPROCESSED',
                attempts: pending.attempts,
              },
              {
                $set: { status: 'PROCESSING', processingStartedAt: new Date() },
                $inc: { attempts: 1 },
                $unset: { nextAttemptAt: 1 },
              },
              { returnDocument: 'after' },
            )
            .exec();
          if (!event) return;
          const where = {
            _id: event._id,
            status: 'PROCESSING' as const,
            attempts: event.attempts,
          };
          try {
            await handle(event);
            await this.model
              .updateOne(where, {
                $set: { status: 'OK', completedAt: new Date() },
                $unset: { processingStartedAt: 1, lastError: 1 },
              })
              .exec();
          } catch (error) {
            const exhausted = (event.attempts ?? 0) >= 3;
            await this.model
              .updateOne(where, {
                $set: {
                  status: exhausted ? 'ERROR' : 'UNPROCESSED',
                  ...(exhausted
                    ? { completedAt: new Date() }
                    : { nextAttemptAt: new Date(Date.now() + 10_000) }),
                  lastError:
                    error instanceof Error ? error.message : String(error),
                },
                $unset: { processingStartedAt: 1 },
              })
              .exec();
          }
        }),
      );
      // Keep the guard until every event settles, even after a database error.
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;
    } finally {
      this.running = false;
    }
  }

  async recover(): Promise<void> {
    const events = await this.model
      .find({
        status: 'PROCESSING',
        processingStartedAt: { $lt: new Date(Date.now() - 60_000) },
      })
      .exec();
    for (const event of events) {
      const exhausted = (event.attempts ?? 0) >= 3;
      await this.model
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
  }

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
