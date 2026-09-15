import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ImageEvent } from '../../../../../libs/contracts/index.js';
import {
  PostImageTransport,
  type Delivery,
} from '../../../../../libs/rabbitmq/post-image-transport.js';
import { PostMediaEventsService } from './post-media-events.service.js';

@Injectable()
export class PostImageResultConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly transport: PostImageTransport,
    private readonly events: PostMediaEventsService,
  ) {}
  async onModuleInit(): Promise<void> {
    await this.transport.start();
    await this.transport.consumeResults((event, delivery) =>
      this.handle(event, delivery),
    );
  }
  async onModuleDestroy(): Promise<void> {
    await this.transport.close();
  }
  async handle(event: ImageEvent, delivery: Delivery): Promise<void> {
    try {
      await this.events.accept(event);
      delivery.ack();
    } catch {
      await delivery.disconnect();
    }
  }
}
