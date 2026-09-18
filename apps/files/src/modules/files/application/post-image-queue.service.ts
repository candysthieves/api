import type { ConsumeMessage } from 'amqplib';
import { validateOrReject } from 'class-validator';
import { Injectable, Logger } from '@nestjs/common';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ImageInputEventDto } from '../api/dto/image-input-event.dto.js';
import { PostImageWorkerService } from './post-image-worker.service.js';

@Injectable()
export class PostImageQueueService {
  private readonly logger = new Logger(PostImageQueueService.name);
  constructor(private readonly worker: PostImageWorkerService) {}
  @RabbitSubscribe({ name: 'postImageInputEvents' })
  async handle(body: Buffer, message: ConsumeMessage): Promise<void | Nack> {
    try {
      const event = ImageInputEventDto.fromMessage(body, message);
      await validateOrReject(event, {
        validationError: { target: false, value: false },
      });
      await this.worker.processImage(event);
    } catch (error) {
      this.logger.error(
        'Unable to handle image event',
        error instanceof Error ? error.stack : error,
      );
      return new Nack(false);
    }
  }
}
