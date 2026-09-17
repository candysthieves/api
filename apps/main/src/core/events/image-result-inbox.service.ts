import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventStatus } from '../../generated/prisma/client.js';
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
    this.logger.log(
      `Inbox upsert started: eventId=${event.eventId} postId=${event.data.postId} index=${event.data.index}`,
    );
    const saved = await this.prisma.inboxEvent.upsert({
      where: { eventId: event.eventId },
      create: {
        eventId: event.eventId,
        consumer: event.consumer,
        type: event.type,
        data: event.data,
      },
      update: {},
    });
    this.logger.log(
      `Inbox upsert completed: eventId=${event.eventId} inboxId=${saved.id} status=${saved.status} attempts=${saved.attempts}`,
    );
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
        const data = event.data as ImageEvent['data'];
        const context = `eventId=${event.eventId} inboxId=${event.id} postId=${data.postId} index=${data.index}`;
        this.logger.log(
          `Inbox processing started: ${context} attempts=${event.attempts} imageStatus=${data.status}`,
        );
        await this.prisma.inboxEvent.update({
          where: { id: event.id },
          data: { status: EventStatus.PROCESSING },
        });
        this.logger.log(`Inbox status saved: ${context} status=PROCESSING`);
        try {
          await this.applyMediaEvent({
            eventId: event.eventId,
            consumer: 'MAIN',
            type: 'post.image.updated.v1',
            data: event.data as ImageEvent['data'],
          });
          await this.markCompleted(event.id);
          this.logger.log(`Inbox processing completed: ${context} status=OK`);
        } catch (error) {
          this.logger.error(
            `Inbox processing failed: ${context} errorType=${error instanceof Error ? error.name : typeof error}`,
          );
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
    const context = `eventId=${event.eventId} postId=${data.postId} index=${data.index}`;
    this.logger.log(
      `Applying image result: ${context} status=${data.status} fileId=${data.image?.fileId ?? 'null'} previewFileId=${data.preview?.fileId ?? 'null'}`,
    );

    if (data.status === 'FAILED') {
      this.logger.error(
        `Image processing failed: post ${data.postId}, index ${data.index}`,
      );
      await this.imagesRepository.deletePost(data.postId);
      this.logger.log(`Failed image result handled: ${context}`);
      return;
    }

    this.logger.log(`Post image update started: ${context}`);
    await this.imagesRepository.updateImage(
      data.postId,
      data.index,
      data.image,
    );
    this.logger.log(`Post image update returned: ${context}`);
    if (data.preview) {
      this.logger.log(`Post preview update started: ${context}`);
      await this.imagesRepository.updatePreview(data.postId, data.preview);
      this.logger.log(`Post preview update completed: ${context}`);
    }
    if (!(await this.imagesRepository.markReadyIfComplete(data.postId))) {
      this.logger.log(`Post readiness unchanged, SSE skipped: ${context}`);
      return;
    }
    this.sse.emit(SseEventEnum.POST_MEDIA_UPDATED, {
      postId: data.postId,
    });
    this.logger.log(
      `SSE emitted locally: ${context} type=${SseEventEnum.POST_MEDIA_UPDATED}`,
    );
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
    this.logger.warn(
      `Inbox failure status saved: inboxId=${id} status=${attempts + 1 > 2 ? EventStatus.ERROR : EventStatus.UNPROCESSED} attempts=${attempts + 1}`,
    );
  }

  private async updateExpiredEvents(): Promise<void> {
    const result = await this.prisma.inboxEvent.updateMany({
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
    if (result.count > 0) {
      this.logger.warn(`Expired inbox events reset: count=${result.count}`);
    }
  }
}
