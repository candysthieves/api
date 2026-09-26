import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type {
  AvatarImageInputEvent,
  ImageInputEvent,
} from '../../../../../libs/contracts/index.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { MainRabbitMqProducerService } from '../rabbitmq/main-rabbitmq-producer.service.js';
import { EventStoreService } from './event-store.service.js';

@Injectable()
export class ImageOutboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventStoreService,
    private readonly producer: MainRabbitMqProducerService,
  ) {}

  async save(postId: string, files: Express.Multer.File[]): Promise<void> {
    for (const [index, file] of files.entries()) {
      await this.prisma.outputEvent.create({
        data: {
          eventId: randomUUID(),
          consumer: 'FILES',
          type: 'post.image.process.v1',
          data: {
            postId,
            index,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
          },
          body: new Uint8Array(file.buffer),
        },
      });
    }
  }

  async saveAvatar(userId: string, file: Express.Multer.File): Promise<void> {
    await this.prisma.outputEvent.create({
      data: {
        eventId: randomUUID(),
        consumer: 'FILES',
        type: 'avatar.image.process.v1',
        data: {
          userId,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
        body: new Uint8Array(file.buffer),
      },
    });
  }

  async abort(postId: string): Promise<void> {
    await this.prisma.outputEvent.updateMany({
      where: {
        status: 'UNPROCESSED',
        data: { path: ['postId'], equals: postId },
      },
      data: {
        status: 'ERROR',
        completedAt: new Date(),
        nextAttemptAt: null,
        lastError: 'POST_CREATION_FAILED',
      },
    });
  }

  @Cron('* * * * * *', { waitForCompletion: true })
  async processPending(): Promise<void> {
    await this.events.run('outputEvent', async (event) => {
      if (!event.body || !event.data) throw new Error('MISSING_IMAGE_INPUT');
      const common = {
        ...(event.data as Record<string, unknown>),
        eventId: event.eventId,
        body: Buffer.from(event.body),
      };
      if (event.type === 'post.image.process.v1')
        await this.producer.publishImage(common as unknown as ImageInputEvent);
      else if (event.type === 'avatar.image.process.v1')
        await this.producer.publishAvatarImage(
          common as unknown as AvatarImageInputEvent,
        );
      else throw new Error(`UNKNOWN_IMAGE_EVENT_TYPE:${event.type}`);
    });
  }
}
