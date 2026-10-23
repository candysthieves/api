import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaymentStatusChangedEvent } from '@libs/contracts';

// Отправляет события статуса платежа из outbox в RabbitMQ.
@Injectable()
export class PaymentEventsTransport {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly configService: ConfigService,
  ) {}

  // Публикует постоянное сообщение; ошибка соединения позволит outbox повторить отправку.
  async publish(paymentStatusEvent: PaymentStatusChangedEvent): Promise<void> {
    if (!this.amqpConnection.connected) {
      throw new Error('TRANSPORT_UNAVAILABLE');
    }
    await this.amqpConnection.publish(
      '',
      `${this.configService.getOrThrow<string>('RABBITMQ_FILES_TO_MAIN_QUEUE')}.payments.status`,
      Buffer.from(JSON.stringify(paymentStatusEvent)),
      {
        persistent: true,
        messageId: paymentStatusEvent.eventId,
        type: paymentStatusEvent.type,
      },
    );
  }
}
