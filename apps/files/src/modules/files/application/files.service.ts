import { Injectable } from '@nestjs/common';
import { FileDocument, FileType } from '../schemas/files.schema.js';
import sharp from 'sharp';
import { FileDataFactory } from './factories/file-data.factory.js';
import { Model } from 'mongoose';
import { S3Adapter } from '../../../core/adapters/s3.adapter.js';
import { InjectModel } from '@nestjs/mongoose';
import { UploadFileContract } from '../api/contracts/upload-file.contract.js';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    private readonly s3Adapter: S3Adapter,
  ) {}
  async processImage(file: UploadFileContract, type: FileType) {
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

      case FileType.AVATAR_PREVIEW:
        image = image.resize(204, 204, { fit: 'inside' }).webp({ quality: 80 });
        break;
    }

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

  async saveFile(file: UploadFileContract, type: FileType) {
    const processed = await this.processImage(file, type);

    const createFileData = FileDataFactory.prepareCreateData({
      type,
      originalName: file.originalName,
      size: processed.size,
      width: processed.width,
      height: processed.height,
      format: processed.format,
    });

    await this.s3Adapter.uploadFile(
      createFileData.key,
      processed.buffer,
      processed.format,
    );

    return this.fileModel.create(createFileData);
  }

  validateFileSize(size: number): boolean {
    const maxSize = 5 * 1024 * 1024;

    return size <= maxSize;
  }
}
