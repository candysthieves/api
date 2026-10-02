import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type {
  AvatarImageEvent,
  ImageEvent,
} from '../../../../libs/contracts/index.js';
import { FilesRabbitMqProducerService } from '../rabbitmq/files-rabbitmq-producer.service.js';
import { OutboxRepository } from './outbox/outbox.repository.js';
import { InboxRepository } from './inbox/inbox.repository.js';
import type { StoredEvent } from './schemas/stored-event.schema.js';

@Injectable()
export class FilesEventsScheduler {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly producer: FilesRabbitMqProducerService,
    private readonly inbox: InboxRepository,
  ) {}

  // Отправляет ожидающие результаты в RabbitMQ.
  @Cron('* * * * * *', { waitForCompletion: true })
  async processPending(): Promise<void> {
    await this.outbox.run((event) => this.publishEvent(event));
  }

  // Возвращает зависшие события в обработку или завершает их с ошибкой.
  @Cron('*/10 * * * * *', { waitForCompletion: true })
  async recover(): Promise<void> {
    await this.inbox.recover();
    await this.outbox.recover();
  }

  // Очищает старые события из входящей и исходящей очередей.
  @Cron('0 * * * * *', { waitForCompletion: true })
  async cleanup(): Promise<void> {
    await this.inbox.cleanup();
    await this.outbox.cleanup();
  }

  // Публикует результат в очередь, выбранную по типу события.
  private async publishEvent(event: StoredEvent): Promise<void> {
    const base = {
      eventId: event._id,
      consumer: 'MAIN' as const,
      data: event.data,
    };

    switch (event.type) {
      case 'avatar.image.updated':
        await this.producer.publishOutputEvent({
          ...base,
          type: event.type,
        } as AvatarImageEvent);
        return;
      case 'post.image.updated':
        await this.producer.publishOutputEvent({
          ...base,
          type: event.type,
        } as ImageEvent);
        return;
      default:
        throw new Error(`UNKNOWN_IMAGE_EVENT_TYPE:${event.type}`);
    }
  }
}
