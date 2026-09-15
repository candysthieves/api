import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InputEventDocument = HydratedDocument<InputEvent>;

@Schema({ collection: 'input_events', timestamps: true })
export class InputEvent {
  @Prop({ required: true, unique: true, index: true }) eventId: string;
  @Prop({ required: true }) postId: string;
  @Prop({ required: true }) index: number;
  @Prop({ required: true, enum: ['PROCESSING', 'READY', 'FAILED'] })
  state: 'PROCESSING' | 'READY' | 'FAILED';
}

export const InputEventSchema = SchemaFactory.createForClass(InputEvent);
