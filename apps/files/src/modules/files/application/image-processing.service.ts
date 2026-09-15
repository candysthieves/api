import { Injectable, Logger } from '@nestjs/common';
import sharp, { Sharp } from 'sharp';
import { UploadFileContract } from '../../../../../../libs/contracts/index.js';
import { FileType } from '../schemas/files.schema.js';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  async process(file: UploadFileContract, type: FileType) {
    const memBefore = process.memoryUsage();
    const resized = this.resize(sharp(file.buffer), type);
    const image = this.compress(resized);

    const buffer = await image.toBuffer();
    const metadata = await sharp(buffer).metadata();
    const memAfter = process.memoryUsage();

    this.logger.debug?.(
      JSON.stringify({
        event: 'image_processed_memory',
        type,
        inputSizeBytes: file.size,
        outputSizeBytes: buffer.length,
        rssMiB: Math.round(memAfter.rss / 1024 / 1024),
        heapUsedMiB: Math.round(memAfter.heapUsed / 1024 / 1024),
        rssDiffMiB: Math.round((memAfter.rss - memBefore.rss) / 1024 / 1024),
      }),
    );

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
    return image.webp({ quality: 80 });
  }
}
