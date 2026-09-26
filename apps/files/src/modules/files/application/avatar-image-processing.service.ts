import { Injectable } from '@nestjs/common';
import type {
  AvatarImageEvent,
  MediaFile,
} from '../../../../../../libs/contracts/index.js';
import { FilesInboxRepository } from '../../../events/files-inbox.repository.js';
import { FilesOutboxRepository } from '../../../events/files-outbox.repository.js';
import type { StoredEvent } from '../../../events/schemas/stored-event.schema.js';
import { S3Adapter } from '../../../core/adapters/s3.adapter.js';
import { FileType } from '../schemas/files.schema.js';
import { FilesService } from './files.service.js';

@Injectable()
export class AvatarImageProcessingService {
  constructor(
    private readonly inbox: FilesInboxRepository,
    private readonly files: FilesService,
    private readonly s3: S3Adapter,
    private readonly outbox: FilesOutboxRepository,
  ) {}
  async processImage(record: StoredEvent): Promise<void> {
    if (await this.outbox.exists(record._id)) return;
    const data = record.data as
      | { userId: string; originalName: string; mimeType: string; size: number }
      | undefined;
    if (!data || !record.body) throw new Error('MISSING_AVATAR_INPUT');
    const file = {
      targetId: data.userId,
      buffer: record.body,
      size: data.size,
      mimeType: data.mimeType,
      originalName: data.originalName,
    };
    const image = await this.files.saveFile(file, FileType.AVATAR);
    const preview = await this.files.saveFile(file, FileType.AVATAR_PREVIEW);
    if (!(await this.inbox.isCurrent(record))) return;
    const toMedia = (f: {
      fileId: string;
      key: string;
      width: number;
      height: number;
    }): MediaFile => ({
      fileId: f.fileId,
      url: this.s3.getUrl(f.key),
      width: f.width,
      height: f.height,
    });
    const event: AvatarImageEvent = {
      eventId: record._id,
      consumer: 'MAIN',
      type: 'avatar.image.updated.v1',
      data: {
        userId: data.userId,
        image: toMedia(image),
        preview: toMedia(preview),
      },
    };
    await this.outbox.create(event);
  }
}
