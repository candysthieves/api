import { Injectable } from '@nestjs/common';
import sharp, { Sharp } from 'sharp';
import { UploadFileContract } from '../../../../../../libs/contracts/index.js';
import { FileType } from '../schemas/files.schema.js';

@Injectable()
export class ImageProcessingService {
  async process(file: UploadFileContract, type: FileType) {
    const resized = this.resize(sharp(file.buffer), type);
    const image = this.compress(resized);

    const buffer = await image.toBuffer();
    const metadata = await sharp(buffer).metadata();
    return {
      buffer,
      size: buffer.length,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  }

  private resize(image: Sharp, type: FileType): Sharp {
    switch (type) {
      case FileType.POST_PREVIEW:
        return image.resize(234, 238, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      case FileType.AVATAR_PREVIEW:
        return image.resize(204, 204, { fit: 'inside' });
      default:
        return image;
    }
  }

  private compress(image: Sharp): Sharp {
    return image.webp({ quality: 50 });
  }
}
