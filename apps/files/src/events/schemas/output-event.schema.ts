import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ImageEvent } from '../../../../../libs/contracts/index.js';

export type OutputEventDocument = HydratedDocument<OutputEvent>;

@Schema({ collection: 'output_events', timestamps: true })
export class OutputEvent {
  @Prop({ required: true, unique: true, index: true }) eventId: string;
  @Prop({ required: true }) consumer: 'MAIN';
  @Prop({ required: true }) type: 'post.image.updated.v1';
  @Prop({ required: true, type: Object }) data: ImageEvent['data'];
  @Prop({ required: true, default: 'UNPROCESSED' }) status:
    'UNPROCESSED' | 'OK';
}

export const OutputEventSchema = SchemaFactory.createForClass(OutputEvent);
OutputEventSchema.index({ type: 1, status: 1 });

OutputEventSchema.index(
  { 'data.postId': 1, 'data.index': 1, 'data.status': 1 },
  { unique: true },
);
