import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module.js';
import { FilesEventsController } from './files-events.controller.js';
import { FilesEventsService } from './files-events.service.js';
import { StoredEvent, StoredEventSchema } from './schemas/event.schema.js';
@Module({ imports: [RabbitMqModule, MongooseModule.forFeature([{ name: StoredEvent.name, schema: StoredEventSchema, collection: 'output_events' }, { name: 'InputEvent', schema: StoredEventSchema, collection: 'input_events' }])], controllers: [FilesEventsController], providers: [FilesEventsService], exports: [FilesEventsService, MongooseModule] })
export class FilesEventsModule {}
