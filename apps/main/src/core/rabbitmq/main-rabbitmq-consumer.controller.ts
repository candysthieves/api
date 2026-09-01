import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, Message } from 'amqplib';
import { PostMediaEventsService } from '../events/post-media-events.service.js';
import type { MediaEvent } from '../events/post-media-events.service.js';
import { RabbitMessageDto } from './dto/rabbit-message.dto.js';

@Controller()
export class MainRabbitMqConsumerController {
  constructor(private readonly events: PostMediaEventsService) {}

  @EventPattern('post.media.event')
  async handlePostMediaEvent(
    @Payload() event: MediaEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    await this.events.accept(event);
    (context.getChannelRef() as Channel).ack(context.getMessage() as Message);
  }

  @EventPattern('rabbit.test.response')
  handleTestResponse(
    @Payload() _response: RabbitMessageDto,
    @Ctx() context: RmqContext,
  ): void {
    (context.getChannelRef() as Channel).ack(context.getMessage() as Message);
  }
}
