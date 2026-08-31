import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, Message } from 'amqplib';
import { RabbitMessageDto } from './dto/rabbit-message.dto.js';

@Controller()
export class MainRabbitMqConsumerController {
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
