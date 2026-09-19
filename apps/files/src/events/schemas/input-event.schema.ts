import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { StoredEvent } from './stored-event.schema.js';

@Schema({ collection: 'input_events', versionKey: false })
export class InputEvent extends StoredEvent {}
export const InputEventSchema = SchemaFactory.createForClass(InputEvent);
InputEventSchema.index({ status: 1, nextAttemptAt: 1 });
InputEventSchema.index({ status: 1, processingStartedAt: 1 });
InputEventSchema.index({ status: 1, completedAt: 1 });
