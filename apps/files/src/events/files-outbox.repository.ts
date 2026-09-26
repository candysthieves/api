import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  AvatarImageEvent,
  ImageEvent,
} from '../../../../libs/contracts/index.js';
import { OutputEvent } from './schemas/output-event.schema.js';
import { StoredEvent } from './schemas/stored-event.schema.js';
import { MongoEventRepository } from './mongo-event.repository.js';

@Injectable()
export class FilesOutboxRepository extends MongoEventRepository {
  constructor(@InjectModel(OutputEvent.name) model: Model<StoredEvent>) {
    super(model);
  }

  async create(event: ImageEvent | AvatarImageEvent): Promise<void> {
    const { eventId, ...data } = event;
    await this.insert({
      _id: eventId,
      ...data,
      status: 'UNPROCESSED',
      attempts: 0,
    });
  }
}
