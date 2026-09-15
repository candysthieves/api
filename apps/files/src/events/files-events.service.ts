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
  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.publishPending().catch((err) => {
        this.logger.error(
          JSON.stringify({
            event: 'publish_pending_unhandled_error',
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          }),
        );
      });
    }, 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async create(type: string, data: Record<string, unknown>) {
    const event = await this.output.create({
      eventId: crypto.randomUUID(),
      consumer: 'MAIN',
      type,
      data,
      status: EventStatus.UNPROCESSED,
      attempts: 0,
    });
    return event;
  }

  async acknowledge(eventId: string): Promise<boolean> {
    const event = await this.output.findOne({ eventId }).exec();
    if (!event) return false;
    if (event.status !== EventStatus.OK) {
      event.status = EventStatus.OK;
      await event.save();
    }
    return true;
  }

  private async publishPending(): Promise<void> {
    if (this.isPublishing) return;
    this.isPublishing = true;
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
