import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FilesRabbitMqProducerService } from '../rabbitmq/files-rabbitmq-producer.service.js';
import {
  EventStatus,
  StoredEvent,
  StoredEventDocument,
} from './schemas/event.schema.js';
import { EventStatus, StoredEvent, StoredEventDocument } from './schemas/event.schema.js';

@Injectable()
export class FilesEventsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(
    @InjectModel(StoredEvent.name)
    private readonly output: Model<StoredEventDocument>,
    private readonly producer: FilesRabbitMqProducerService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.publishPending(), 1000);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async create(type: string, data: Record<string, unknown>) {
    return this.output.create({
      eventId: crypto.randomUUID(),
      consumer: 'MAIN',
      type,
      data,
      status: EventStatus.UNPROCESSED,
      attempts: 0,
    });
  }
  constructor(@InjectModel(StoredEvent.name) private readonly output: Model<StoredEventDocument>, private readonly producer: FilesRabbitMqProducerService) {}
  onModuleInit() { this.timer = setInterval(() => void this.publishPending(), 1000); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async create(type: string, data: Record<string, unknown>) { return this.output.create({ eventId: crypto.randomUUID(), consumer: 'MAIN', type, data, status: EventStatus.UNPROCESSED, attempts: 0 }); }
  async acknowledge(eventId: string): Promise<boolean> {
    const event = await this.output.findOne({ eventId }).exec();
    if (!event) return false;
    if (event.status !== EventStatus.OK) {
      event.status = EventStatus.OK;
      await event.save();
    }
    if (event.status !== EventStatus.OK) { event.status = EventStatus.OK; await event.save(); }
    return true;
  }
  private async publishPending() {
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
    const event = await this.output.findOneAndUpdate({ status: EventStatus.UNPROCESSED, $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] }, { $set: { status: EventStatus.SENDED }, $inc: { attempts: 1 } }, { new: true }).exec();
    if (!event) return;
    try {
      await this.producer.publishMediaEvent({
        eventId: event.eventId,
        consumer: event.consumer,
        type: event.type,
        data: event.data,
      });
    } catch (error) {
    try { await this.producer.publishMediaEvent({ eventId: event.eventId, consumer: event.consumer, type: event.type, data: event.data }); }
    catch (error) {
      await this.output
        .updateOne(
          { _id: event._id, status: EventStatus.SENDED },
          {
            $set: {
              status: EventStatus.UNPROCESSED,
              lastError: error instanceof Error ? error.message : String(error),
              nextAttemptAt: new Date(Date.now() + 10_000),
            },
          },
        )
        .exec();
    }
  }
}
