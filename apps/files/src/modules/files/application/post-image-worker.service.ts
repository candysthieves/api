import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import type {
  ImageInputEvent,
  MediaFile,
} from '../../../../../../libs/contracts/index.js';
import { FilesOutboxRepository } from '../../../events/files-outbox.repository.js';
import { FilesService } from './files.service.js';
import { FilesInboxRepository } from '../../../events/files-inbox.repository.js';
import { FileType, type FileDocument } from '../schemas/files.schema.js';
import { S3Adapter } from '../../../core/adapters/s3.adapter.js';
import { CancelledPostRepository } from './cancelled-post.repository.js';

@Injectable()
export class PostImageWorkerService {
  private readonly logger = new Logger(PostImageWorkerService.name);
  constructor(
    private readonly inbox: FilesInboxRepository,
    private readonly files: FilesService,
    private readonly s3: S3Adapter,
    private readonly cancelledPosts: CancelledPostRepository,
    private readonly outbox: FilesOutboxRepository,
  ) {}

  async processImage(event: ImageInputEvent): Promise<void> {
    try {
      const postIsCancelled = await this.cancelledPosts.isCancelled(
        event.postId,
      );
      if (postIsCancelled) return;

      const hasFailedPostEvent = await this.inbox.hasFailedEvent(event.postId);
      if (hasFailedPostEvent) return;

      const eventForCurrentImage = await this.inbox.findEvent(event);
      if (
        eventForCurrentImage?.state === 'READY' ||
        eventForCurrentImage?.state === 'FAILED'
      )
        return;

      await this.inbox.createEvent({
        postId: event.postId,
        index: event.index,
      });

      const file = {
        targetId: event.postId,
        buffer: event.body,
        size: event.size,
        mimeType: event.mimeType,
        originalName: event.originalName,
      };
      const image = await this.files.saveFile(file, FileType.POST);

      let preview: FileDocument | null = null;
      if (event.index === 0) {
        preview = await this.files.saveFile(file, FileType.POST_PREVIEW);
      }

      await this.outbox.updateOrCreate({
        eventId: randomUUID(),
        consumer: 'MAIN',
        type: 'post.image.updated.v1',
        data: {
          postId: event.postId,
          index: event.index,
          status: 'READY',
          image: this.toMediaFile(image),
          preview: preview ? this.toMediaFile(preview) : null,
        },
      });
      await this.inbox.updateEvent(event, 'READY');
    } catch (error) {
      await this.failProcessing(event, error);
    }
  }

  private async failProcessing(
    event: ImageInputEvent,
    error: unknown,
  ): Promise<void> {
    this.logger.error(
      `Image processing failed: post ${event.postId}, index ${event.index}`,
      error,
    );

    await Promise.allSettled([
      this.outbox.updateOrCreate({
        eventId: randomUUID(),
        consumer: 'MAIN',
        type: 'post.image.updated.v1',
        data: {
          postId: event.postId,
          index: event.index,
          status: 'FAILED',
          image: null,
          preview: null,
        },
      }),
      this.inbox.updateEvent(event, 'FAILED'),
    ]);
  }

  private toMediaFile(file: {
    fileId: string;
    key: string;
    width: number;
    height: number;
  }): MediaFile {
    return {
      fileId: file.fileId,
      url: this.s3.getUrl(file.key),
      width: file.width,
      height: file.height,
    };
  }
}
