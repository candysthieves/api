import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type {
  AvatarImageEvent,
  ImageEvent,
} from '../../../../libs/contracts/index.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FilesRabbitMqProducerService {
  constructor(
    private readonly connection: AmqpConnection,
    private readonly config: ConfigService,
  ) {}

  async publishOutputEvent(
    event: ImageEvent | AvatarImageEvent,
  ): Promise<void> {
    if (!this.connection.connected) throw new Error('TRANSPORT_UNAVAILABLE');
    const options: NonNullable<Parameters<ChannelWrapper['publish']>[3]> = {
      persistent: true,
      timeout: 5_000,
      messageId: event.eventId,
      contentType: 'application/json',
      type: event.type,
    };
    await this.connection.publish(
      '',
      `${this.config.getOrThrow<string>('RABBITMQ_FILES_TO_MAIN_QUEUE')}.${event.type.startsWith('avatar.') ? 'avatar-images' : 'post-images'}.results.v1`,
      Buffer.from(JSON.stringify(event)),
      options,
    );
  }
}
