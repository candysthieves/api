import type { ConsumeMessage } from 'amqplib';
import { Injectable, Logger } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  MAX_AVATAR_IMAGE_SIZE,
  type AvatarImageInputEvent,
} from '../../../../../../libs/contracts/index.js';
import { FilesInboxRepository } from '../../../events/files-inbox.repository.js';

@Injectable()
export class AvatarImageQueueService {
  private readonly logger = new Logger(AvatarImageQueueService.name);
  constructor(private readonly inbox: FilesInboxRepository) {}

  @RabbitSubscribe({ name: 'avatarImageInputEvents' })
  async handle(body: Buffer, message: ConsumeMessage): Promise<void | Nack> {
    const h = (message.properties.headers ?? {}) as unknown as Record<
      string,
      unknown
    >;
    const eventId: unknown = message.properties.messageId;
    const mimeType: unknown = message.properties.contentType;
    const size = Number(h['size']);
    if (
      typeof eventId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(eventId) ||
      typeof h['userId'] !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(h['userId']) ||
      typeof mimeType !== 'string' ||
      !['image/jpeg', 'image/png'].includes(mimeType) ||
      !Buffer.isBuffer(body) ||
      !body.length ||
      size !== body.length ||
      size > MAX_AVATAR_IMAGE_SIZE
    )
      return new Nack(false);
    const rawOriginalName = h['originalName'];
    const event: AvatarImageInputEvent = {
      eventId,
      userId: h['userId'],
      originalName: typeof rawOriginalName === 'string' ? rawOriginalName : '',
      mimeType: mimeType as AvatarImageInputEvent['mimeType'],
      size,
      body,
    };
    try {
      await this.inbox.accept(event);
      return;
    } catch (error) {
      this.logger.error(`Avatar input persistence failed: ${eventId}`, error);
      return new Nack(true);
    }
  }
}
