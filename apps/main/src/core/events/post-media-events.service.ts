import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  EventStatus,
  MediaStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { FilesTcpClient } from './files-tcp.client.js';
import { SseService } from '../sse/sse.service.js';
import { SseEventEnum } from '../sse/types/sse-event.type.js';

export type MediaEvent = {
  eventId: string;
  consumer: string;
  type: 'post.media.processed' | 'post.media.failed';
  data: { postId: string; images?: unknown; preview?: unknown; code?: string };
};

@Injectable()
export class PostMediaEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostMediaEventsService.name);
  private timer?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesTcpClient,
    private readonly sse: SseService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.processPending(), 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async accept(event: MediaEvent): Promise<void> {
    const startedAt = Date.now();
    await this.prisma.inputEvent.upsert({
      where: { eventId: event.eventId },
      create: {
        eventId: event.eventId,
        consumer: event.consumer,
        type: event.type,
        data: event.data as Prisma.InputJsonValue,
      },
      update: {},
    });
    this.logger.log(
      JSON.stringify({
        event: 'post_media_event_received',
        durationMs: Date.now() - startedAt,
        eventId: event.eventId,
        type: event.type,
        postId: event.data.postId,
      }),
    );
    setImmediate(() => void this.processPending());
  }

  private async processPending(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      await this.expireStaleProcessingEvents();

      while (true) {
        const event = await this.claimNextEvent();
        if (!event) return;
        try {
          const startedAt = Date.now();
          const data = event.data as unknown as MediaEvent['data'];
          this.logger.log(
            JSON.stringify({
              event: 'post_media_event_processing_started',
              eventId: event.eventId,
              type: event.type,
              postId: data.postId,
              attempt: event.attempts,
            }),
          );
          await this.applyMediaEvent(event);
          this.logger.log(
            JSON.stringify({
              event: 'post_media_event_applied',
              durationMs: Date.now() - startedAt,
              eventId: event.eventId,
              postId: data.postId,
            }),
          );
          await this.files.acknowledge(event.eventId);
          await this.markCompleted(event.id);
          this.logger.log(
            JSON.stringify({
              event: 'post_media_event_processing_completed',
              durationMs: Date.now() - startedAt,
              eventId: event.eventId,
              postId: data.postId,
            }),
          );
        } catch (error) {
          const data = event.data as unknown as MediaEvent['data'];
          this.logger.error(
            JSON.stringify({
              event: 'post_media_event_processing_failed',
              eventId: event.eventId,
              type: event.type,
              postId: data.postId,
              attempt: event.attempts,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          await this.scheduleRetry(event.id, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async claimNextEvent() {
    const event = await this.prisma.inputEvent.findFirst({
      where: {
        status: EventStatus.UNPROCESSED,
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!event) return null;

    const claim = await this.prisma.inputEvent.updateMany({
      where: { id: event.id, status: EventStatus.UNPROCESSED },
      data: { status: EventStatus.PROCESSING, attempts: { increment: 1 } },
    });
    return claim.count ? event : null;
  }

  private async applyMediaEvent(event: {
    eventId: string;
    type: string;
    data: Prisma.JsonValue;
  }): Promise<void> {
    const data = event.data as unknown as MediaEvent['data'];

    if (event.type === 'post.media.processed') {
      const updatedPost = await this.prisma.post.updateMany({
        where: { id: data.postId },
        data: {
          images: data.images as Prisma.InputJsonValue,
          preview: data.preview as Prisma.InputJsonValue,
          mediaStatus: MediaStatus.READY,
          mediaError: null,
        },
      });
      if (!updatedPost.count) {
        this.logger.warn(
          JSON.stringify({
            event: 'post_media_event_discarded_post_not_found',
            eventId: event.eventId,
            postId: data.postId,
          }),
        );
        return;
      }

      this.sse.emit(SseEventEnum.POST_CREATED, { postId: data.postId });
    } else if (event.type === 'post.media.failed') {
      await this.prisma.post.updateMany({
        where: { id: data.postId },
        data: {
          mediaStatus: MediaStatus.FAILED,
          mediaError: data.code ?? 'IMAGE_PROCESSING_FAILED',
        },
      });
    }
  }

  private async markCompleted(id: string): Promise<void> {
    await this.prisma.inputEvent.updateMany({
      where: { id, status: EventStatus.PROCESSING },
      data: { status: EventStatus.OK, lastError: null },
    });
  }

  private async scheduleRetry(id: string, error: unknown): Promise<void> {
    await this.prisma.inputEvent.updateMany({
      where: { id, status: EventStatus.PROCESSING },
      data: {
        status: EventStatus.UNPROCESSED,
        lastError: error instanceof Error ? error.message : String(error),
        nextAttemptAt: new Date(Date.now() + 10_000),
      },
    });
  }

  private async expireStaleProcessingEvents(): Promise<void> {
    await this.prisma.inputEvent.updateMany({
      where: {
        status: EventStatus.PROCESSING,
        updatedAt: { lt: new Date(Date.now() - 10 * 60_000) },
      },
      data: { status: EventStatus.ERROR, lastError: 'PROCESSING_TIMEOUT' },
    });
  }
}
