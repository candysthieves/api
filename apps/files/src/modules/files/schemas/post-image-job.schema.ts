import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type {
  ImageEvent,
  MediaFile,
} from '../../../../../../libs/contracts/index.js';

export type PostImageJobDocument = HydratedDocument<PostImageJob>;

@Schema({ collection: 'post_image_jobs', timestamps: true })
export class PostImageJob {
  @Prop({ required: true, unique: true, index: true }) imageId: string;
  @Prop({ required: true }) postId: string;
  @Prop({ required: true }) index: number;
  @Prop({ required: true }) total: number;
  @Prop({ required: true, default: 0 }) attempts: number;
  @Prop({ required: true, default: 'QUEUED' }) state:
    'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED';
  @Prop({ required: true, default: 0 }) retryAt: number;
  @Prop({ required: true, default: 0 }) revision: number;
  @Prop({ required: true }) fileId: string;
  @Prop({ required: true }) previewFileId: string;
  @Prop({ type: Object, default: null }) image: MediaFile | null;
  @Prop({ type: Object, default: null }) preview: MediaFile | null;
  @Prop({ type: Object, default: null }) pendingEvent: ImageEvent | null;
  @Prop({ type: Object, default: null }) error: {
    code: string;
    traceId: string;
  } | null;
}

export const PostImageJobSchema = SchemaFactory.createForClass(PostImageJob);
