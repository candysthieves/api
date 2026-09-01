import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  Prisma,
  EventStatus,
  MediaStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { FilesTcpClient } from './files-tcp.client.js';

export type MediaEvent = {
  eventId: string;
  consumer: string;
  type: 'post.media.processed' | 'post.media.failed';
  data: {
    postId: string;
    images?: unknown;
    preview?: unknown;
    code?: string;
  };
};

@Injectable()
export class PostMediaEventsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesTcpClient,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.processPending(), 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async accept(event: MediaEvent): Promise<void> {
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
  }

  private async processPending(): Promise<void> {
    await this.expireStaleProcessingEvents();

    const event = await this.claimNextEvent();
    if (!event) return;

    try {
      await this.applyMediaEvent(event);
      await this.files.acknowledge(event.eventId);
      await this.markCompleted(event.id);
    } catch (error) {
      await this.scheduleRetry(event.id, error);
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
        const result = await this.files.deletePostMedia(
          data.images,
          data.preview,
        );
        if (result.error) throw new Error(result.error.code);
      }
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
      data: {
        status: EventStatus.ERROR,
        lastError: 'PROCESSING_TIMEOUT',
      },
    });
  }
}
