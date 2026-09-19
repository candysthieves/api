import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type { ImageInputEvent } from '../../../../../libs/contracts/index.js';
import { Injectable } from '@nestjs/common';
import { firstValueFrom, from, timeout } from 'rxjs';

@Injectable()
export class MainRabbitMqProducerService {
  constructor(
    private readonly connection: AmqpConnection,
    private readonly config: ConfigService,
  ) {}

  async checkConnection(): Promise<boolean> {
    if (!this.connection.connected) return false;
    const channel = this.connection.managedConnection.createChannel();
    try {
      await firstValueFrom(
        from(
          (async () => {
            await channel.waitForConnect();
            await channel.checkQueue(
              `${this.config.getOrThrow<string>('RABBITMQ_FILES_TO_MAIN_QUEUE')}.post-images.results.v1`,
            );
          })(),
        ).pipe(timeout(5_000)),
      );
      return true;
    } catch {
      return false;
    } finally {
      await channel.close().catch(() => undefined);
    }
  }

  async publishImage(event: ImageInputEvent): Promise<void> {
    if (!this.connection.connected) throw new Error('TRANSPORT_UNAVAILABLE');
    const options: NonNullable<Parameters<ChannelWrapper['publish']>[3]> = {
      persistent: true,
      timeout: 5_000,
      messageId: event.eventId,
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
