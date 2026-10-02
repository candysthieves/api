import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { StoredEvent } from './stored-event.schema.js';

@Schema({ collection: 'input_events', versionKey: false })
export class InputEvent extends StoredEvent {}
export const InputEventSchema = SchemaFactory.createForClass(InputEvent);
