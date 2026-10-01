import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SseService } from '../sse/sse.service.js';
import { SseEventEnum } from '../sse/types/sse-event.type.js';
import type { ImageEvent } from '../../../../../libs/contracts/index.js';
import { PostImagesRepository } from './post-images.repository.js';
import { EventStoreService } from './event-store.service.js';
import type { AvatarImageEvent } from '../../../../../libs/contracts/index.js';
import { AvatarImagesRepository } from './avatar-images.repository.js';

@Injectable()
export class ImageResultInboxService {
  private readonly logger = new Logger(ImageResultInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sse: SseService,
    private readonly imagesRepository: PostImagesRepository,
    private readonly events: EventStoreService,
    private readonly avatarImages: AvatarImagesRepository,
  ) {}

  async accept(event: ImageEvent | AvatarImageEvent): Promise<void> {
    await this.prisma.inboxEvent.upsert({
      where: { eventId: event.eventId },
      create: event,
      update: {},
    });
  }

  @Cron('* * * * * *', { waitForCompletion: true })
  async processPending(): Promise<void> {
    await this.events.run('inboxEvent', async (event) => {
      if (event.type === 'avatar.image.updated.v1') {
        const avatarEvent = {
          eventId: event.eventId,
          consumer: 'MAIN',
          type: event.type,
          data: event.data as unknown as AvatarImageEvent['data'],
        };
        if (
          await this.avatarImages.applyAvatar(
            avatarEvent.data.userId,
            avatarEvent.data.image,
            avatarEvent.data.preview,
          )
        )
          this.sse.emit(SseEventEnum.AVATAR_UPDATED, {
            userId: avatarEvent.data.userId,
          });
      } else if (event.type === 'post.image.updated.v1' || !event.type) {
        await this.applyMediaEvent({
          eventId: event.eventId,
          consumer: 'MAIN',
          type: 'post.image.updated.v1',
          data: event.data as ImageEvent['data'],
        });
      } else throw new Error(`UNKNOWN_IMAGE_EVENT_TYPE:${event.type}`);
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
    this.logger.log(
      `Post READY; SSE emitted: event=${SseEventEnum.POST_MEDIA_UPDATED} postId=${data.postId}`,
    );
  }
}
