import { Injectable } from '@nestjs/common';
import { FileType } from '../schemas/files.schema.js';
import sharp from 'sharp';

@Injectable()
export class FilesService {
  async processImage(file: Express.Multer.File, type: FileType) {
    let image = sharp(file.buffer);
    switch (type) {
      case FileType.POST:
        image = image.webp({ quality: 80 });
        break;

      case FileType.POST_PREVIEW:
        image = image
          .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 });
        break;

      case FileType.AVATAR:
        image = image.webp({ quality: 80 });
        break;

      case FileType.AVATAR_SMALL:
        image = image.resize(200, 200, { fit: 'inside' }).webp({ quality: 80 });
        break;
    }

    const buffer = await image.toBuffer();
    const metadata = await sharp(buffer).metadata();

    return {
      buffer,
      size: buffer.length,
      width: metadata.width,
      height: metadata.height,
    };
  }
}
