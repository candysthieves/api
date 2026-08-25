import { Injectable } from '@nestjs/common';
import { FileDocument, FileType } from '../schemas/files.schema.js';
import sharp from 'sharp';
import { FileDataFactory } from './factories/file-data.factory.js';
import { Model } from 'mongoose';
import { S3Adapter } from '../../../core/adapters/s3.adapter.js';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectResult } from '../../../core/object-result.js';
import bytes from 'bytes';
import { UploadFileDto } from '../api/dto/upload-file.dto.js';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    private readonly s3Adapter: S3Adapter,
  ) {}
  async processImage(file: UploadFileDto, type: FileType) {
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
    };
  }

  async saveFile(file: UploadFileDto, type: FileType) {
    const processed = await this.processImage(file, type);

    const createFileData = FileDataFactory.prepareCreateData({
      type,
      originalName: file.originalName,
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

  validateFileSize(size: number): ObjectResult<true | null> {
    const maxSize = bytes('5MB');

    if (!maxSize || maxSize > size) {
      return ObjectResult.failure('File size must not exceed 5 MB');
    }

    return ObjectResult.success(true);
  }
}
