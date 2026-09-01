import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, Message } from 'amqplib';
import { RabbitMessageDto } from './dto/rabbit-message.dto.js';
import { PostMediaEventsService } from '../events/post-media-events.service.js';
import type { MediaEvent } from '../events/post-media-events.service.js';

@Controller()
export class MainRabbitMqConsumerController {
  constructor(private readonly events: PostMediaEventsService) {}
  @EventPattern('post.media.event')
  async handlePostMediaEvent(@Payload() event: MediaEvent, @Ctx() context: RmqContext): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as Message;
    await this.events.accept(event);
    channel.ack(message);
  }
  constructor(private readonly events: PostMediaEventsService) {}
  @EventPattern('post.media.event')
  async handlePostMediaEvent(
    @Payload() event: MediaEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as Message;
    await this.events.accept(event);
    channel.ack(message);
  }
  @EventPattern('rabbit.test.response')
  handleTestResponse(
    @Payload() response: RabbitMessageDto,
    @Ctx() context: RmqContext,
  ): void {
    const channel = context.getChannelRef() as Channel;
    const originalMessage = context.getMessage() as Message;

    channel.ack(originalMessage);
  }
}
