import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FilesRabbitMqProducerService } from '../rabbitmq/files-rabbitmq-producer.service.js';
import {
  EventStatus,
  StoredEvent,
  StoredEventDocument,
} from './schemas/event.schema.js';

const PUBLISH_CONFIRMATION_TIMEOUT_MS = 3_000;

@Injectable()
export class FilesEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FilesEventsService.name);
  private timer?: NodeJS.Timeout;
  private isPublishing = false;

  constructor(
    @InjectModel(StoredEvent.name)
    private readonly output: Model<StoredEventDocument>,
    private readonly producer: FilesRabbitMqProducerService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.publishPending(), 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async create(type: string, data: Record<string, unknown>) {
    const event = await this.output.create({
      eventId: crypto.randomUUID(),
      consumer: 'MAIN',
      type,
      data,
      status: EventStatus.UNPROCESSED,
      attempts: 0,
    });
    return event;
  }

  async acknowledge(eventId: string): Promise<boolean> {
    const event = await this.output.findOne({ eventId }).exec();
    if (!event) return false;
    if (event.status !== EventStatus.OK) {
      event.status = EventStatus.OK;
      await event.save();
    }
    return true;
  }

  private async publishPending(): Promise<void> {
    if (this.isPublishing) return;
    this.isPublishing = true;
    try {
      await this.requeueUnconfirmedEvents();

      while (true) {
        const now = new Date();
        const event = await this.output
          .findOneAndUpdate(
            {
              status: EventStatus.UNPROCESSED,
              $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
            },
            { $set: { status: EventStatus.SENDED }, $inc: { attempts: 1 } },
            { returnDocument: 'after' },
          )
          .exec();
        if (!event) return;

        try {
          const publishStartedAt = Date.now();
          this.logger.log(
            JSON.stringify({
              event: 'files_output_event_publish_started',
              eventId: event.eventId,
              type: event.type,
              attempt: event.attempts,
            }),
          );
          await this.producer.publishMediaEvent({
            eventId: event.eventId,
            consumer: event.consumer,
            type: event.type,
            data: event.data,
          });
          this.logger.log(
            JSON.stringify({
              event: 'files_output_event_publish_completed',
              durationMs: Date.now() - publishStartedAt,
              eventId: event.eventId,
              type: event.type,
              attempt: event.attempts,
            }),
          );
        } catch (error) {
          this.logger.error(
            JSON.stringify({
              event: 'files_output_event_publish_failed',
              error: error instanceof Error ? error.message : String(error),
              eventId: event.eventId,
              type: event.type,
              attempt: event.attempts,
            }),
          );
          await this.output
            .updateOne(
              { _id: event._id, status: EventStatus.SENDED },
              {
                $set: {
                  status: EventStatus.UNPROCESSED,
                  lastError:
                    error instanceof Error ? error.message : String(error),
                  nextAttemptAt: new Date(Date.now() + 10_000),
                },
              },
            )
            .exec();
        }
      }
    } finally {
      this.isPublishing = false;
    }
  }

  private async requeueUnconfirmedEvents(): Promise<void> {
    await this.output
      .updateMany(
        {
          status: EventStatus.SENDED,
          updatedAt: {
            $lte: new Date(Date.now() - PUBLISH_CONFIRMATION_TIMEOUT_MS),
          },
        },
        {
          $set: {
            status: EventStatus.UNPROCESSED,
            nextAttemptAt: null,
            lastError: 'DELIVERY_CONFIRMATION_TIMEOUT',
          },
        },
      )
      .exec();
  }
}
