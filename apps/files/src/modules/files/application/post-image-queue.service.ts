import type { ConsumeMessage } from 'amqplib';
import { validateOrReject } from 'class-validator';
import { Injectable, Logger } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ImageInputEventDto } from '../api/dto/image-input-event.dto.js';
import { FilesInboxRepository } from '../../../events/files-inbox.repository.js';

@Injectable()
export class PostImageQueueService {
  private readonly logger = new Logger(PostImageQueueService.name);

  constructor(private readonly inbox: FilesInboxRepository) {}

  @RabbitSubscribe({ name: 'postImageInputEvents' })
  async handle(body: Buffer, message: ConsumeMessage): Promise<void | Nack> {
    const metadata = this.getMessageMetadata(message, body);
    this.logger.log(`Image input received: ${metadata}`);

    let event: ImageInputEventDto;
    try {
      event = ImageInputEventDto.fromMessage(body, message);
      await validateOrReject(event, {
        validationError: { target: false, value: false },
      });
      this.logger.log(
        `Image input validated: eventId=${event.eventId} postId=${event.postId} index=${event.index}`,
      );
    } catch (error) {
      this.logger.warn(
        `Image input rejected: validation failed; ${metadata}; error=${this.formatError(error)}`,
      );
      return new Nack(false);
    }

    try {
      this.logger.log(
        `Image input persistence started: eventId=${event.eventId} postId=${event.postId} index=${event.index}`,
      );
      await this.inbox.accept(event);
      this.logger.log(
        `Image input persisted: eventId=${event.eventId} postId=${event.postId} index=${event.index}`,
      );
    } catch (error) {
      this.logger.error(
        `Image input persistence failed: eventId=${event.eventId} postId=${event.postId} index=${event.index}; ${metadata}; error=${this.formatError(error)}`,
      );
      return new Nack(true);
    }
  }

  private getMessageMetadata(message: ConsumeMessage, body: Buffer): string {
    const headers = message.properties.headers ?? {};
    return [
      `eventId=${message.properties.messageId ?? 'missing'}`,
      `postId=${String(headers.postId ?? 'missing')}`,
      `index=${String(headers.index ?? 'missing')}`,
      `originalName=${String(headers.originalName ?? 'missing')}`,
      `size=${String(headers.size ?? 'missing')}`,
      `contentType=${message.properties.contentType ?? 'missing'}`,
      `bodySize=${body.length}`,
      `redelivered=${message.fields.redelivered}`,
    ].join(' ');
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
