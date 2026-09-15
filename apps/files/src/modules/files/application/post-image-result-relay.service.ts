import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PostImageTransport } from '../../../../../../libs/rabbitmq/post-image-transport.js';
import { PostImageJobRepository } from './post-image-job.repository.js';

@Injectable()
export class PostImageResultRelayService
  implements OnModuleInit, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(
    private readonly transport: PostImageTransport,
    private readonly jobs: PostImageJobRepository,
  ) {}
  onModuleInit(): void {
    this.timer = setInterval(() => void this.relay(), 1_000);
  }
  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
  private async relay(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const job of await this.jobs.pending(20)) {
        if (!job.pendingEvent) continue;
        await this.transport.publishResult(
          job.pendingEvent,
          Date.now() + 15_000,
        );
        await this.jobs.clearPending(job.imageId, job.pendingEvent.eventId);
      }
    } catch {
      /* MongoDB keeps the event for the next retry. */
    } finally {
      this.running = false;
    }
  }
}
