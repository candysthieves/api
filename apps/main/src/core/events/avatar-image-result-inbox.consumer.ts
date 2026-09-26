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
      validateAvatarImageEvent(JSON.parse(body.toString('utf8')));
      event = JSON.parse(body.toString('utf8')) as AvatarImageEvent;
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
