import { randomUUID } from 'node:crypto';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type { ImageInputEvent } from '../../../../../libs/contracts/index.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MainRabbitMqProducerService {
  constructor(
    private readonly connection: AmqpConnection,
    private readonly config: ConfigService,
  ) {}

  async publishImage(event: ImageInputEvent): Promise<void> {
    if (!this.connection.connected) throw new Error('TRANSPORT_UNAVAILABLE');
    const options: NonNullable<Parameters<ChannelWrapper['publish']>[3]> = {
      persistent: true,
      timeout: 5_000,
      messageId: randomUUID(),
      contentType: event.mimeType,
      type: 'post.image.process.v1',
      headers: {
        postId: event.postId,
        index: event.index,
        originalName: event.originalName,
        size: event.size,
      },
    };
    await this.connection.publish(
      '',
      `${this.config.getOrThrow<string>('RABBITMQ_MAIN_TO_FILES_QUEUE')}.post-images.v1`,
      event.body,
      options,
    );
  }
}
