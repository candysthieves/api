import type { ConsumeMessage } from 'amqplib';
import { validateOrReject } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ImageInputEventDto } from '../api/dto/image-input-event.dto.js';
import { FilesInboxRepository } from '../../../events/files-inbox.repository.js';

@Injectable()
export class PostImageQueueService {
  constructor(private readonly inbox: FilesInboxRepository) {}

  @RabbitSubscribe({ name: 'postImageInputEvents' })
  async handle(body: Buffer, message: ConsumeMessage): Promise<void | Nack> {
    let event: ImageInputEventDto;
    try {
      event = ImageInputEventDto.fromMessage(body, message);
      await validateOrReject(event, {
        validationError: { target: false, value: false },
      });
    } catch {
      return new Nack(false);
    }
    try {
      await this.inbox.accept(event);
    } catch {
      return new Nack(true);
    }
  }
}
