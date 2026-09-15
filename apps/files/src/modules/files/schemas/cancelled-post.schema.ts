import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CancelledPostDocument = HydratedDocument<CancelledPost>;

@Schema({ collection: 'cancelled_posts', timestamps: true })
export class CancelledPost {
  @Prop({ required: true, unique: true, index: true }) postId: string;
  @Prop({ required: true, expires: 0 }) expiresAt: Date;
}

export const CancelledPostSchema = SchemaFactory.createForClass(CancelledPost);
