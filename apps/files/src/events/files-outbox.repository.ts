import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ImageEvent } from '../../../../libs/contracts/index.js';
import {
  OutputEvent,
  type OutputEventDocument,
} from './schemas/output-event.schema.js';

@Injectable()
export class FilesOutboxRepository {
  constructor(
    @InjectModel(OutputEvent.name)
    private readonly output: Model<OutputEventDocument>,
  ) {}

  async updateOrCreate(event: ImageEvent): Promise<void> {
    await this.output
      .updateOne(
        { 'data.postId': event.data.postId, 'data.index': event.data.index },
        { $set: { ...event, status: 'UNPROCESSED' } },
        { upsert: true },
      )
      .exec();
  }

  async findPending(limit: number): Promise<OutputEventDocument[]> {
    return this.output
      .find({ type: 'post.image.updated.v1', status: 'UNPROCESSED' })
      .limit(limit)
      .exec();
  }

  async markPublished(eventId: string): Promise<void> {
    await this.output.updateOne({ eventId }, { $set: { status: 'OK' } }).exec();
  }
}
