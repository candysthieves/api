import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, EventStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { FilesTcpClient } from './files-tcp.client.js';

export type MediaEvent = { eventId: string; consumer: string; type: 'post.media.processed' | 'post.media.failed'; data: { postId: string; images?: unknown; preview?: unknown; code?: string } };
@Injectable()
export class PostMediaEventsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesTcpClient,
  ) {}
  onModuleInit() { this.timer = setInterval(() => void this.processPending(), 1000); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async accept(event: MediaEvent): Promise<void> {
    await this.prisma.inputEvent.upsert({ where: { eventId: event.eventId }, create: { eventId: event.eventId, consumer: event.consumer, type: event.type, data: event.data as Prisma.InputJsonValue }, update: {} });
  }
  private async processPending(): Promise<void> {
    const event = await this.prisma.inputEvent.findFirst({ where: { status: EventStatus.UNPROCESSED, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }, orderBy: { createdAt: 'asc' } });
    if (!event) return;
    const claim = await this.prisma.inputEvent.updateMany({ where: { id: event.id, status: EventStatus.UNPROCESSED }, data: { status: EventStatus.SENDED, attempts: { increment: 1 } } });
    if (!claim.count) return;
    try {
      const data = event.data as unknown as MediaEvent['data'];
      if (event.type === 'post.media.processed') {
        await this.prisma.post.update({
          where: { id: data.postId },
          data: {
            images: data.images as Prisma.InputJsonValue,
            preview: data.preview as Prisma.InputJsonValue,
          },
        });
      }
      await this.files.acknowledge(event.eventId);
      await this.prisma.inputEvent.update({ where: { id: event.id }, data: { status: EventStatus.OK, lastError: null } });
    } catch (error) {
      await this.prisma.inputEvent.update({
        where: { id: event.id },
        data: {
          status: EventStatus.UNPROCESSED,
          lastError: error instanceof Error ? error.message : String(error),
          nextAttemptAt: new Date(Date.now() + 10_000),
        },
      });
    }
  }
}
