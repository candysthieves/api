import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SseService } from '../sse/sse.service.js';
import { SseEventEnum } from '../sse/types/sse-event.type.js';
import type { ImageEvent } from '../../../../../libs/contracts/index.js';
import { PostImagesRepository } from './post-images.repository.js';
import { EventStoreService } from './event-store.service.js';

@Injectable()
export class ImageResultInboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sse: SseService,
    private readonly imagesRepository: PostImagesRepository,
    private readonly events: EventStoreService,
  ) {}

  async accept(event: ImageEvent): Promise<void> {
    await this.prisma.inboxEvent.upsert({
      where: { eventId: event.eventId },
      create: event,
      update: {},
    });
  }

  @Cron('* * * * * *', { waitForCompletion: true })
  async processPending(): Promise<void> {
    await this.events.run('inboxEvent', async (event) => {
      await this.applyMediaEvent({
        eventId: event.eventId,
        consumer: 'MAIN',
        type: 'post.image.updated.v1',
        data: event.data as ImageEvent['data'],
      });
    });
  }

  private async applyMediaEvent(event: ImageEvent): Promise<void> {
    const { data } = event;
    await this.imagesRepository.updateImage(
      data.postId,
      data.index,
      data.image,
    );
    if (data.preview) {
      await this.imagesRepository.updatePreview(data.postId, data.preview);
    }
    if (!(await this.imagesRepository.markReadyIfComplete(data.postId))) {
      return;
    }
    this.sse.emit(SseEventEnum.POST_MEDIA_UPDATED, {
      postId: data.postId,
    });
  }
}
