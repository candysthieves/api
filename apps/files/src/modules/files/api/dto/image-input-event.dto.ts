import type { ConsumeMessage } from 'amqplib';
import {
  IsByteLength,
  IsInt,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateBy,
} from 'class-validator';
import {
  type ImageInputEvent,
  MAX_POST_IMAGES,
  MAX_POST_IMAGE_SIZE,
} from '../../../../../../../libs/contracts/index.js';

export class ImageInputEventDto implements ImageInputEvent {
  @IsUUID()
  postId: string;

  @IsInt()
  @Min(0)
  @Max(MAX_POST_IMAGES - 1)
  index: number;

  @IsByteLength(0, 255)
  originalName: string;

  @Matches(/^image\/[a-z0-9.+-]+$/i)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(MAX_POST_IMAGE_SIZE)
  size: number;

  @ValidateBy({
    name: 'isImageBody',
    validator: {
      validate: (value: unknown, args) =>
        Buffer.isBuffer(value) &&
        value.length === (args?.object as ImageInputEventDto).size,
      defaultMessage: () => 'body must be a Buffer with length equal to size',
    },
  })
  body: Buffer;

  static fromMessage(
    body: Buffer,
    message: ConsumeMessage,
  ): ImageInputEventDto {
    const headers = message.properties.headers ?? {};
    const dto = new ImageInputEventDto();
    dto.postId = headers.postId as string;
    dto.index = headers.index as number;
    dto.originalName = headers.originalName as string;
    dto.mimeType = message.properties.contentType as string;
    dto.size = headers.size as number;
    dto.body = body;
    return dto;
  }
}
