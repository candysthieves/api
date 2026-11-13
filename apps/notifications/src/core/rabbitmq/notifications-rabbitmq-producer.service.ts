import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import type { ChannelWrapper } from 'amqp-connection-manager';

@Injectable()
export class NotificationsRabbitMqProducerService {
  constructor(
    private readonly connection: AmqpConnection,
    private readonly config: ConfigService,
  ) {}

  async publishToPayments(event: {
    eventId: string;
    type: string;
    [key: string]: unknown;
  }): Promise<void> {
    if (!this.connection.connected) throw new Error('TRANSPORT_UNAVAILABLE');
    const options: NonNullable<Parameters<ChannelWrapper['publish']>[3]> = {
      persistent: true,
      messageId: event.eventId,
      type: event.type,
      timeout: 10_000,
    };
    await this.connection.publish(
      '',
      this.config.getOrThrow<string>(
        'RABBITMQ_NOTIFICATIONS_TO_PAYMENTS_QUEUE',
      ),
      event,
      options,
    );
  }
}
