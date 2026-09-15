import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventStatus, MediaStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SseService } from '../sse/sse.service.js';
import { SseEventEnum } from '../sse/types/sse-event.type.js';
import type { ImageEvent } from '../../../../../libs/contracts/index.js';
import { PostImagesRepository } from './post-images.repository.js';

@Injectable()
export class ImageResultInboxService {
  private readonly logger = new Logger(ImageResultInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sse: SseService,
    private readonly imagesRepository: PostImagesRepository,
  ) {}

  async accept(event: ImageEvent): Promise<void> {
    await this.prisma.inboxEvent.upsert({
      where: { eventId: event.eventId },
      create: {
        eventId: event.eventId,
        consumer: event.consumer,
        type: event.type,
        data: event.data,
      },
      update: {},
    });
  }

  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  private async processPending(): Promise<void> {
    try {
      await this.updateExpiredEvents();

      const events = await this.prisma.inboxEvent.findMany({
        where: {
          status: EventStatus.UNPROCESSED,
          type: 'post.image.updated.v1',
          OR: [
            { attempts: 0 },
            { updatedAt: { lte: new Date(Date.now() - 10_000) } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      for (const event of events) {
        await this.prisma.inboxEvent.update({
          where: { id: event.id },
          data: { status: EventStatus.PROCESSING },
        });
        try {
          await this.applyMediaEvent({
            eventId: event.eventId,
            consumer: 'MAIN',
            type: 'post.image.updated.v1',
            data: event.data as ImageEvent['data'],
          });
          await this.markCompleted(event.id);
        } catch (error) {
          await this.scheduleRetry(event.id, event.attempts, error);
        }
      }
    } catch (error) {
      this.logger.error(
        'Unable to process image results',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async applyMediaEvent(event: ImageEvent): Promise<void> {
    const { data } = event;

    if (data.status === 'FAILED') {
      this.logger.error(
        `Image processing failed: post ${data.postId}, index ${data.index}`,
      );
      await this.imagesRepository.deletePost(data.postId);
      return;
    }

    await this.imagesRepository.updateImage(
      data.postId,
      data.index,
      data.image,
      MediaStatus.READY,
    );
    if (data.preview) {
      await this.imagesRepository.updatePreview(data.postId, data.preview);
    }
    this.sse.emit(SseEventEnum.POST_MEDIA_UPDATED, {
      postId: data.postId,
    });
  }

  private async markCompleted(id: string): Promise<void> {
    await this.prisma.inboxEvent.update({
      where: { id },
      data: { status: EventStatus.OK, lastError: null },
    });
  }

  private async scheduleRetry(
    id: string,
    attempts: number,
    error: unknown,
  ): Promise<void> {
    await this.prisma.inboxEvent.update({
      where: { id },
      data: {
        status: attempts + 1 > 2 ? EventStatus.ERROR : EventStatus.UNPROCESSED,
        attempts: { increment: 1 },
        lastError: error instanceof Error ? error.message : String(error),
        updatedAt: new Date(),
      },
    });
  }

  private async updateExpiredEvents(): Promise<void> {
    await this.prisma.inboxEvent.updateMany({
      where: {
        status: EventStatus.PROCESSING,
        type: 'post.image.updated.v1',
        updatedAt: { lt: new Date(Date.now() - 10 * 60_000) },
      },
      data: {
        status: EventStatus.UNPROCESSED,
        updatedAt: new Date(),
        lastError: 'PROCESSING_TIMEOUT',
      },
    });
  }
}
