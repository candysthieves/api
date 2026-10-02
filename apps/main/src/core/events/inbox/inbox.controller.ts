import { Injectable, Logger } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  validateAvatarImageEvent,
  validateImageEvent,
  type AvatarImageEvent,
  type ImageEvent,
} from '@libs/contracts';
import { InboxService } from '@main/core/events/inbox/inbox.service.js';

@Injectable()
export class InboxController {
  private readonly logger = new Logger(InboxController.name);

  constructor(private readonly inbox: InboxService) {}

  @RabbitSubscribe({ name: 'postImageResults' })
  handlePostImageResult(body: Buffer): Promise<void | Nack> {
    return this.handle(body, 'Image', validateImageEvent);
  }

  @RabbitSubscribe({ name: 'avatarImageResults' })
  handleAvatarImageResult(body: Buffer): Promise<void | Nack> {
    return this.handle(body, 'Avatar', validateAvatarImageEvent);
  }

  private async handle<T extends ImageEvent | AvatarImageEvent>(
    body: Buffer,
    eventName: 'Image' | 'Avatar',
    validate: (value: unknown) => void,
  ): Promise<void | Nack> {
    let event: T;
    try {
      const parsed: unknown = JSON.parse(body.toString('utf8'));
      validate(parsed);
      event = parsed as T;
    } catch {
      this.logger.warn(`${eventName} result rejected: invalid contract`);
      return new Nack(false);
    }

    try {
      await this.inbox.accept(event);
    } catch (error) {
      this.logger.error(
        `${eventName} result persistence failed: ${event.eventId}`,
        error,
      );
      return new Nack(true);
    }
  }
}
