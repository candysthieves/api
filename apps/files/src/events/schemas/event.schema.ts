import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum EventStatus {
  UNPROCESSED = 'UNPROCESSED',
  PROCESSING = 'PROCESSING',
  SENDED = 'SENDED',
  OK = 'OK',
  ERROR = 'ERROR',
}
export type StoredEventDocument = HydratedDocument<StoredEvent>;

@Schema({ timestamps: true })
export class StoredEvent {
  @Prop({ required: true, unique: true, index: true }) eventId: string;
  @Prop({ required: true }) consumer: string;
  @Prop({ required: true }) type: string;
  @Prop({ required: true, type: Object }) data: Record<string, unknown>;
  @Prop({ required: true, enum: EventStatus, default: EventStatus.UNPROCESSED, index: true }) status: EventStatus;
  @Prop({ required: true, default: 0 }) attempts: number;
  @Prop() errorCode?: string;
  @Prop() lastError?: string;
  @Prop({ index: true }) nextAttemptAt?: Date;
}
export const StoredEventSchema = SchemaFactory.createForClass(StoredEvent);
