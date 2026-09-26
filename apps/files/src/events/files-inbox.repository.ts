import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  AvatarImageInputEvent,
  ImageInputEvent,
} from '../../../../libs/contracts/index.js';
import { InputEvent } from './schemas/input-event.schema.js';
import { StoredEvent } from './schemas/stored-event.schema.js';
import { MongoEventRepository } from './mongo-event.repository.js';

@Injectable()
export class FilesInboxRepository extends MongoEventRepository {
  constructor(@InjectModel(InputEvent.name) model: Model<StoredEvent>) {
    super(model);
  }

  async accept(event: ImageInputEvent | AvatarImageInputEvent): Promise<void> {
    const { eventId, body, ...data } = event;
    await this.insert({
      _id: eventId,
      data,
      body,
      type:
        'userId' in event ? 'avatar.image.process.v1' : 'post.image.process.v1',
      status: 'UNPROCESSED',
      attempts: 0,
    });
  }
}
