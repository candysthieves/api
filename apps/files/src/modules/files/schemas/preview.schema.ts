import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  collection: 'previews',
  timestamps: true,
})
export class Preview {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  previewId: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  fileId: string;

  @Prop({
    required: true,
  })
  key: string;

  @Prop({
    required: true,
  })
  size: number;

  @Prop({
    required: true,
  })
  mimeType: string;
}

export const PreviewSchema = SchemaFactory.createForClass(Preview);
