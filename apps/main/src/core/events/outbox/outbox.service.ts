import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type {
  AvatarImageInputEvent,
  ImageInputEvent,
  PaymentWebhookEvent,
} from '@libs/contracts';
import { OutboxRepository } from './outbox.repository.js';
import { MainRabbitMqProducerService } from '../../rabbitmq/main-rabbitmq-producer.service.js';
import { EventStoreService } from '../event-store.service.js';

@Injectable()
export class OutboxService {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly events: EventStoreService,
    private readonly producer: MainRabbitMqProducerService,
  ) {}

  async savePaymentWebhook(externalPaymentId: string): Promise<void> {
    const event: PaymentWebhookEvent = {
      eventId: randomUUID(),
      consumer: 'PAYMENTS',
      type: 'payment.status.requested',
      data: { externalPaymentId },
    };
    await this.outboxRepository.create(event);
  }

  // Сохраняет исходные изображения поста для отправки в files.
  async save(postId: string, files: Express.Multer.File[]): Promise<void> {
    for (const [index, file] of files.entries()) {
      await this.outboxRepository.create({
        eventId: randomUUID(),
        consumer: 'FILES',
        type: 'post.image.process',
        data: {
          postId,
          index,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
        body: new Uint8Array(file.buffer),
      });
    }
  }

  // Сохраняет исходный файл аватара для отправки в files.
  async saveAvatar(userId: number, file: Express.Multer.File): Promise<void> {
    await this.outboxRepository.create({
      eventId: randomUUID(),
      consumer: 'FILES',
      type: 'avatar.image.process',
      data: {
        userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      body: new Uint8Array(file.buffer),
    });
  }

  // Завершает отправку изображений, если создание поста не удалось.
  async abort(postId: string): Promise<void> {
    await this.outboxRepository.abortPostImages(postId);
  }

  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  // Отправляет сохранённые события файловому и платёжному сервисам.
  async processPending(): Promise<void> {
    await this.events.run('outputEvent', async (event) => {
      if (event.type === 'payment.status.requested') {
        await this.producer.publishPaymentWebhook({
          eventId: event.eventId,
          consumer: 'PAYMENTS',
          type: 'payment.status.requested',
          data: event.data as PaymentWebhookEvent['data'],
        });
        return;
      }
      if (!event.body || !event.data) throw new Error('MISSING_IMAGE_INPUT');
      const common = {
        ...(event.data as Record<string, unknown>),
        eventId: event.eventId,
        body: Buffer.from(event.body),
      };
      if (event.type === 'post.image.process')
        await this.producer.publishImage(common as unknown as ImageInputEvent);
      else if (event.type === 'avatar.image.process')
        await this.producer.publishAvatarImage(
          common as unknown as AvatarImageInputEvent,
        );
      else throw new Error(`UNKNOWN_IMAGE_EVENT_TYPE:${event.type}`);
    });
  }
}
