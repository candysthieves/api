import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InboxRepository } from '../../../../events/inbox/inbox.repository.js';
import { FilesService } from './files.service.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';
import { CancelledPostRepository } from '../cancelled-post.repository.js';
import { OutboxRepository } from '../../../../events/outbox/outbox.repository.js';
import { FilesConfig } from '../../../../files.config.js';
import { AvatarImageProcessingService } from './avatar-image-processing.service.js';
import { StoredEvent } from '../../../../events/schemas/stored-event.schema.js';
import { ImageInputEvent } from '@libs/contracts';
import { FileDocument, FileType } from '../../schemas/files.schema.js';
import { toMediaFile } from './to-media-file.js';

@Injectable()
export class PostImageWorkerService {
  constructor(
    private readonly inbox: InboxRepository,
    private readonly files: FilesService,
    private readonly s3: S3Adapter,
    private readonly cancelledPosts: CancelledPostRepository,
    private readonly outbox: OutboxRepository,
    private readonly config: FilesConfig,
    private readonly avatars: AvatarImageProcessingService,
  ) {}

  @Cron('* * * * * *', { waitForCompletion: true })
  async processPending(): Promise<void> {
    await this.inbox.run(
      (event) =>
        event.type === 'avatar.image.process'
          ? this.avatars.processImage(event)
          : event.type === 'post.image.process' || !event.type
            ? this.processImage(event)
            : Promise.reject(
                new Error(`UNKNOWN_IMAGE_EVENT_TYPE:${event.type}`),
              ),
      this.config.postImageConcurrency,
    );
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
      type: 'post.image.updated',
      data: {
        postId: event.postId,
        index: event.index,
        status: 'READY',
        image: toMediaFile(image, this.s3.getUrl(image.key)),
        preview: preview
          ? toMediaFile(preview, this.s3.getUrl(preview.key))
          : null,
      },
    });
  }
}
