import { Prop } from '@nestjs/mongoose';
import type {
  ImageEvent,
  ImageInputEvent,
} from '../../../../../libs/contracts/index.js';

export class StoredEvent {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({
    type: String,
    required: true,
    enum: ['UNPROCESSED', 'PROCESSING', 'OK', 'ERROR'],
    default: 'UNPROCESSED',
  })
  status: 'UNPROCESSED' | 'PROCESSING' | 'OK' | 'ERROR';
  @Prop({ type: Object }) data?:
    ImageEvent['data'] | Omit<ImageInputEvent, 'eventId' | 'body'>;
  @Prop({ type: Buffer }) body?: Buffer;
  @Prop({ type: String }) consumer?: string;
  @Prop({ type: String }) type?: string;
  @Prop({ type: Number, default: 0 }) attempts?: number;
  @Prop({ type: Date }) processingStartedAt?: Date;
  @Prop({ type: Date }) nextAttemptAt?: Date;
  @Prop({ type: Date }) completedAt?: Date;
  @Prop({ type: String }) lastError?: string;
  @Prop({ type: Date, default: Date.now }) createdAt?: Date;
}
