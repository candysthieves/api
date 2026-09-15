import { validateImageEvent } from '../../../../../libs/contracts/index.js';
import { Injectable } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type { ImageEvent } from '../../../../../libs/contracts/index.js';
import { ImageResultInboxService } from './image-result-inbox.service.js';

@Injectable()
export class ImageResultInboxConsumer {
  constructor(private readonly events: ImageResultInboxService) {}

  @RabbitSubscribe({ name: 'postImageResults' })
  async handle(body: Buffer): Promise<void | Nack> {
    let event: ImageEvent;
    try {
      const parsed: unknown = JSON.parse(body.toString('utf8'));
      validateImageEvent(parsed);
      event = parsed;
    } catch {
      return new Nack(false);
    }
    try {
      await this.events.accept(event);
    } catch {
      return new Nack(true);
    }
  }
}
