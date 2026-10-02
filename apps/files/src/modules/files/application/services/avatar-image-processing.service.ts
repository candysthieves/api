import { Injectable } from '@nestjs/common';
import type { AvatarImageEvent } from '../../../../../../../libs/contracts/index.js';
import { InboxRepository } from '../../../../events/inbox/inbox.repository.js';
import { OutboxRepository } from '../../../../events/outbox/outbox.repository.js';
import type { StoredEvent } from '../../../../events/schemas/stored-event.schema.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';
import { FileType } from '../../schemas/files.schema.js';
import { FilesService } from './files.service.js';
import { toMediaFile } from './to-media-file.js';

@Injectable()
export class AvatarImageProcessingService {
  constructor(
    private readonly inbox: InboxRepository,
    private readonly files: FilesService,
    private readonly s3: S3Adapter,
    private readonly outbox: OutboxRepository,
  ) {}
  async processImage(record: StoredEvent): Promise<void> {
    if (await this.outbox.exists(record._id)) return;
    const data = record.data as
      | { userId: number; originalName: string; mimeType: string; size: number }
      | undefined;
    if (!data || !record.body) throw new Error('MISSING_AVATAR_INPUT');
    const file = {
      targetId: String(data.userId),
      buffer: record.body,
      size: data.size,
      mimeType: data.mimeType,
      originalName: data.originalName,
    };
    const image = await this.files.saveFile(file, FileType.AVATAR);
    const preview = await this.files.saveFile(file, FileType.AVATAR_PREVIEW);
    if (!(await this.inbox.isCurrent(record))) return;
    const event: AvatarImageEvent = {
      eventId: record._id,
      consumer: 'MAIN',
      type: 'avatar.image.updated',
      data: {
        userId: data.userId,
        image: toMediaFile(image, this.s3.getUrl(image.key)),
        preview: toMediaFile(preview, this.s3.getUrl(preview.key)),
      },
    };
    await this.outbox.create(event);
  }
}
