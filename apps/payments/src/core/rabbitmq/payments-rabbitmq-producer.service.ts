import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type {
  PaymentNotificationEvent,
  PaymentResultEvent,
} from '@libs/contracts';

@Injectable()
export class PaymentsRabbitMqProducerService {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly configService: ConfigService,
  ) {}

  async publishPaymentResult(event: PaymentResultEvent): Promise<void> {
    if (!this.amqpConnection.connected)
      throw new Error('TRANSPORT_UNAVAILABLE');
    const options: NonNullable<Parameters<ChannelWrapper['publish']>[3]> = {
      persistent: true,
      messageId: event.eventId,
      type: event.type,
      timeout: 10_000,
    };
    await this.amqpConnection.publish(
      '',
      this.configService.getOrThrow<string>('RABBITMQ_PAYMENTS_TO_MAIN_QUEUE'),
      event,
      options,
    );
  }

  async publishNotificationEvent(
    event: PaymentNotificationEvent,
  ): Promise<void> {
    if (!this.amqpConnection.connected)
      throw new Error('TRANSPORT_UNAVAILABLE');
    const options: NonNullable<Parameters<ChannelWrapper['publish']>[3]> = {
      persistent: true,
      messageId: event.eventId,
      type: event.type,
      timeout: 10_000,
    };
    await this.amqpConnection.publish(
      '',
      this.configService.getOrThrow<string>(
        'RABBITMQ_PAYMENTS_TO_NOTIFICATIONS_QUEUE',
      ),
      event,
      options,
    );
  }
}
