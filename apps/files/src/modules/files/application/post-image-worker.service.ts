import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type {
  ImageInputEvent,
  MediaFile,
} from '../../../../../../libs/contracts/index.js';
import { FilesOutboxRepository } from '../../../events/files-outbox.repository.js';
import { FilesInboxRepository } from '../../../events/files-inbox.repository.js';
import type { StoredEvent } from '../../../events/schemas/stored-event.schema.js';
import { FilesService } from './files.service.js';
import { FileType, type FileDocument } from '../schemas/files.schema.js';
import { S3Adapter } from '../../../core/adapters/s3.adapter.js';
import { CancelledPostRepository } from './cancelled-post.repository.js';

@Injectable()
export class PostImageWorkerService {
  constructor(
    private readonly inbox: FilesInboxRepository,
    private readonly files: FilesService,
    private readonly s3: S3Adapter,
    private readonly cancelledPosts: CancelledPostRepository,
    private readonly outbox: FilesOutboxRepository,
  ) {}

  @Cron('* * * * * *', { waitForCompletion: true })
  async processPending(): Promise<void> {
    await this.inbox.run((event) => this.processImage(event));
  }

  async processImage(record: StoredEvent): Promise<void> {
    if (await this.outbox.exists(record._id)) return;
    const event = record.data as Omit<ImageInputEvent, 'eventId' | 'body'>;
    if (!event || !record.body) throw new Error('MISSING_IMAGE_INPUT');
    if (await this.cancelledPosts.isCancelled(event.postId)) return;
    const file = {
      targetId: event.postId,
      buffer: record.body,
      size: event.size,
      mimeType: event.mimeType,
      originalName: event.originalName,
    };
    const image = await this.files.saveFile(file, FileType.POST);
    let preview: FileDocument | null = null;
    if (event.index === 0)
      preview = await this.files.saveFile(file, FileType.POST_PREVIEW);
    // Recovery may have expired this attempt while S3 was busy.
    if (!(await this.inbox.isCurrent(record))) return;
    await this.outbox.create({
      eventId: record._id,
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
