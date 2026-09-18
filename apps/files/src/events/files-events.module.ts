import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module.js';
import { InputEvent, InputEventSchema } from './schemas/input-event.schema.js';
import {
  OutputEvent,
  OutputEventSchema,
} from './schemas/output-event.schema.js';
import { FilesInboxRepository } from './files-inbox.repository.js';
import { FilesOutboxRepository } from './files-outbox.repository.js';
import { FilesEventsService } from './files-events.service.js';

@Module({
  imports: [
    RabbitMqModule,
    MongooseModule.forFeature([
      { name: InputEvent.name, schema: InputEventSchema },
      { name: OutputEvent.name, schema: OutputEventSchema },
    ]),
  ],
  providers: [FilesInboxRepository, FilesOutboxRepository, FilesEventsService],
  exports: [FilesInboxRepository, FilesOutboxRepository],
})
export class FilesEventsModule {}
