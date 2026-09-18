import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FilesRabbitMqProducerService } from '../rabbitmq/files-rabbitmq-producer.service.js';
import { FilesOutboxRepository } from './files-outbox.repository.js';

@Injectable()
export class FilesEventsService {
  private readonly logger = new Logger(FilesEventsService.name);

  constructor(
    private readonly outbox: FilesOutboxRepository,
    private readonly rabbitMqProducer: FilesRabbitMqProducerService,
  ) {}

  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  private async processingOutPutEvents(): Promise<void> {
    try {
      for (const event of await this.outbox.findPending(10)) {
        await this.rabbitMqProducer.publishOutputEvent({
          eventId: event.eventId,
          consumer: event.consumer,
          type: event.type,
          data: event.data,
        });
        await this.outbox.markPublished(event.eventId);
      }
    } catch (error) {
      this.logger.error(
        'Unable to deliver file events',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
