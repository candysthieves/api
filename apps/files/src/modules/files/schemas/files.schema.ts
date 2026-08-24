import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum FileType {
  POST = 'post',
  POST_PREVIEW = 'post_preview',
  AVATAR = 'avatar',
  AVATAR_SMALL = 'avatar_small',
}

export type FileDocument = HydratedDocument<File>;

@Schema({
  collection: 'files',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class File {
  @Prop({
    name: 'file_id',
    required: true,
    unique: true,
    index: true,
  })
  fileId: string;

  @Prop({
    required: true,
    enum: FileType,
  })
  type: FileType;

  @Prop({
    required: true,
  })
  key: string;

  @Prop({
    name: 'original_name',
    required: true,
  })
  originalName: string;

  @Prop({
    required: true,
  })
  size: number;

  @Prop({
    required: true,
  })
  width: number;

  @Prop({
    required: true,
  })
  height: number;

  @Prop({
    name: 'mime_type',
    required: true,
    default: 'image/webp',
  })
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  @Prop({ name: 'deleted_at' })
  deletedAt?: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);
