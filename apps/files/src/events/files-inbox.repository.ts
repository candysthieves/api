import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ImageInputEvent } from '../../../../libs/contracts/index.js';
import {
  InputEvent,
  type InputEventDocument,
} from './schemas/input-event.schema.js';

@Injectable()
export class FilesInboxRepository {
  constructor(
    @InjectModel(InputEvent.name)
    private readonly inputEvents: Model<InputEventDocument>,
  ) {}

  async hasFailedEvent(postId: string): Promise<boolean> {
    return Boolean(
      await this.inputEvents.exists({ postId, state: 'FAILED' }).exec(),
    );
  }

  async findEvent(
    event: Pick<ImageInputEvent, 'postId' | 'index'>,
  ): Promise<InputEvent | null> {
    return this.inputEvents
      .findOne({ eventId: `${event.postId}:${event.index}` })
      .exec();
  }

  async createEvent(
    event: Pick<ImageInputEvent, 'postId' | 'index'>,
  ): Promise<void> {
    await this.inputEvents.create({
      eventId: `${event.postId}:${event.index}`,
      postId: event.postId,
      index: event.index,
      state: 'PROCESSING',
    });
  }

  async updateEvent(
    event: Pick<ImageInputEvent, 'postId' | 'index'>,
    state: 'READY' | 'FAILED',
  ): Promise<void> {
    await this.inputEvents
      .updateOne(
        {
          eventId: `${event.postId}:${event.index}`,
          state:
            state === 'READY' ? 'PROCESSING' : { $in: ['PROCESSING', 'READY'] },
        },
        { $set: { state } },
      )
      .exec();
  }
}
