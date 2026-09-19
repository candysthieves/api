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
      await this.events.accept(event);
    } catch {
      this.logger.error(
        `Image result persistence failed: eventId=${event.eventId} postId=${event.data.postId}, requeue=true`,
      );
      return new Nack(true);
    }
  }
}
