import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type { PaymentCompletedEvent } from '@libs/contracts';

@Injectable()
export class PaymentsRabbitMqProducerService {
  constructor(
    private readonly connection: AmqpConnection,
    private readonly config: ConfigService,
  ) {}

  async publishPaymentResult(event: PaymentCompletedEvent): Promise<void> {
    if (!this.connection.connected) throw new Error('TRANSPORT_UNAVAILABLE');
    const options: NonNullable<Parameters<ChannelWrapper['publish']>[3]> = {
      persistent: true,
      messageId: event.eventId,
      type: event.type,
      timeout: 5_000,
    };
    await this.connection.publish(
      '',
      this.config.getOrThrow<string>('RABBITMQ_PAYMENTS_TO_MAIN_QUEUE'),
      event,
      options,
    );
  }
}
