import { validateImageEvent } from '../../../../../libs/contracts/index.js';
import { Injectable, Logger } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type { ImageEvent } from '../../../../../libs/contracts/index.js';
import { ImageResultInboxService } from './image-result-inbox.service.js';

@Injectable()
export class ImageResultInboxConsumer {
  private readonly logger = new Logger(ImageResultInboxConsumer.name);

  constructor(private readonly events: ImageResultInboxService) {}

  @RabbitSubscribe({ name: 'postImageResults' })
  async handle(body: Buffer): Promise<void | Nack> {
    this.logger.log(`Image result received: bytes=${body.length}`);
    let event: ImageEvent;
    try {
      const parsed: unknown = JSON.parse(body.toString('utf8'));
      validateImageEvent(parsed);
      event = parsed;
    } catch {
      this.logger.warn(
        'Image result rejected: invalid JSON or contract, requeue=false',
      );
      return new Nack(false);
    }
    try {
      this.logger.log(
        `Image result validated: eventId=${event.eventId} postId=${event.data.postId} index=${event.data.index} status=${event.data.status}`,
      );
      await this.events.accept(event);
      this.logger.log(
        `Image result handler completed: eventId=${event.eventId}, ready for automatic ack`,
      );
    } catch {
      this.logger.error(
        `Image result persistence failed: eventId=${event.eventId} postId=${event.data.postId}, requeue=true`,
      );
      return new Nack(true);
    }
  }
}
