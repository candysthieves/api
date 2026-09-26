import { Injectable, Logger } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  validateAvatarImageEvent,
  type AvatarImageEvent,
} from '../../../../../libs/contracts/index.js';
import { ImageResultInboxService } from './image-result-inbox.service.js';

@Injectable()
export class AvatarImageResultInboxConsumer {
  private readonly logger = new Logger(AvatarImageResultInboxConsumer.name);
  constructor(private readonly inbox: ImageResultInboxService) {}
  @RabbitSubscribe({ name: 'avatarImageResults' })
  async handle(body: Buffer): Promise<void | Nack> {
    let event: AvatarImageEvent;
    try {
      const parsed: unknown = JSON.parse(body.toString('utf8'));
      validateAvatarImageEvent(parsed);
      event = parsed;
    } catch {
      this.logger.warn('Avatar result rejected: invalid contract');
      return new Nack(false);
    }
    try {
      await this.inbox.accept(event);
    } catch (error) {
      this.logger.error(
        `Avatar result persistence failed: ${event.eventId}`,
        error,
      );
      return new Nack(true);
    }
  }
}
