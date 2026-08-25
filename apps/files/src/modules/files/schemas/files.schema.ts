import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum FileType {
  POST = 'POST',
  POST_PREVIEW = 'POST_PREVIEW',
  AVATAR = 'AVATAR',
  AVATAR_PREVIEW = 'AVATAR_PREVIEW',
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
  _id: Types.ObjectId;
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
    default: 'webp',
  })
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  @Prop({ type: Date, default: null, name: 'deleted_at' })
  deletedAt: Date | null;
}

export const FileSchema = SchemaFactory.createForClass(File);
