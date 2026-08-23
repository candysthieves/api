import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum FileType {
  POST = 'POST',
  POST_PREVIEW = 'POST_PREVIEW',
  AVATAR = 'AVATAR',
  AVATAR_SMALL = 'AVATAR_SMALL',
}

export type FileDocument = HydratedDocument<File>;

@Schema({
  collection: 'files',
  timestamps: true,
})
export class File {
  @Prop({
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
    required: true,
    default: 'image/webp',
  })
  mimeType: string;
}

export const FileSchema = SchemaFactory.createForClass(File);
