import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { StoredEvent } from './stored-event.schema.js';

@Schema({ collection: 'output_events', versionKey: false })
export class OutputEvent extends StoredEvent {}
export const OutputEventSchema = SchemaFactory.createForClass(OutputEvent);
OutputEventSchema.index({ status: 1, nextAttemptAt: 1 });
OutputEventSchema.index({ status: 1, processingStartedAt: 1 });
OutputEventSchema.index({ status: 1, completedAt: 1 });
