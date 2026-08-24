import { Injectable } from '@nestjs/common';
import { FileDocument, FileType } from '../schemas/files.schema.js';
import sharp from 'sharp';
import { FileDataFactory } from './factories/file-data.factory.js';
import { Model } from 'mongoose';
import { S3Adapter } from '../adapters/s3.adapter.js';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    private readonly s3Adapter: S3Adapter,
  ) {}
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

  async saveFile(file: Express.Multer.File, type: FileType) {
    const processed = await this.processImage(file, type);

    const createFileData = FileDataFactory.prepareCreateData({
      type,
      originalName: file.originalname,
      size: processed.size,
      width: processed.width,
      height: processed.height,
    });

    await this.s3Adapter.uploadFIle(
      createFileData.key,
      processed.buffer,
      createFileData.mimeType,
    );

    return this.fileModel.create(createFileData);
  }
}
