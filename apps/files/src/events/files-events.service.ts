import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type {
  AvatarImageEvent,
  ImageEvent,
} from '../../../../libs/contracts/index.js';
import { FilesRabbitMqProducerService } from '../rabbitmq/files-rabbitmq-producer.service.js';
import { FilesOutboxRepository } from './files-outbox.repository.js';
import { FilesInboxRepository } from './files-inbox.repository.js';
import { InputEvent } from './schemas/input-event.schema.js';

@Injectable()
export class FilesEventsService implements OnModuleInit {
  private readonly logger = new Logger(FilesEventsService.name);

  constructor(
    private readonly outbox: FilesOutboxRepository,
    private readonly producer: FilesRabbitMqProducerService,
    private readonly inbox: FilesInboxRepository,
    @InjectModel(InputEvent.name)
    private readonly inputEventModel: Model<InputEvent>,
  ) {}

  async onModuleInit(): Promise<void> {
    const droppedIndexes = await this.inputEventModel.syncIndexes();
    if (droppedIndexes.length) {
      this.logger.warn(
        `Removed obsolete MongoDB input event indexes: ${droppedIndexes.join(', ')}`,
      );
    }
  }

  @Cron('* * * * * *', { waitForCompletion: true })
  async processPending(): Promise<void> {
    await this.outbox.run(async (event) => {
      if (event.type === 'avatar.image.updated.v1') {
        await this.producer.publishOutputEvent({
          eventId: event._id,
          consumer: 'MAIN',
          type: event.type,
          data: event.data as AvatarImageEvent['data'],
        });
      } else if (event.type === 'post.image.updated.v1' || !event.type) {
        await this.producer.publishOutputEvent({
          eventId: event._id,
          consumer: 'MAIN',
          type: 'post.image.updated.v1',
          data: event.data as ImageEvent['data'],
        });
      } else {
        throw new Error(`UNKNOWN_IMAGE_EVENT_TYPE:${event.type}`);
      }
    });
  }

  @Cron('*/10 * * * * *', { waitForCompletion: true })
  async recover(): Promise<void> {
    await this.inbox.recover();
    await this.outbox.recover();
  }

  @Cron('0 * * * * *', { waitForCompletion: true })
  async cleanup(): Promise<void> {
    await this.inbox.cleanup();
    await this.outbox.cleanup();
  }
}
