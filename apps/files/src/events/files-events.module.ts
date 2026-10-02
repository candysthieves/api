import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module.js';
import { InputEvent, InputEventSchema } from './schemas/input-event.schema.js';
import {
  OutputEvent,
  OutputEventSchema,
} from './schemas/output-event.schema.js';
import { InboxRepository } from './inbox/inbox.repository.js';
import { OutboxRepository } from './outbox/outbox.repository.js';
import { FilesEventsScheduler } from './files-events.scheduler.js';
import { AvatarImageQueueService } from '../modules/files/application/services/avatar-image-queue.service.js';

@Module({
  imports: [
    RabbitMqModule,
    MongooseModule.forFeature([
      { name: InputEvent.name, schema: InputEventSchema },
      { name: OutputEvent.name, schema: OutputEventSchema },
    ]),
  ],
  providers: [
    InboxRepository,
    OutboxRepository,
    FilesEventsScheduler,
    AvatarImageQueueService,
  ],
  exports: [InboxRepository, OutboxRepository],
})
export class FilesEventsModule {}
