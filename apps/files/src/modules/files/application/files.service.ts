import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { S3Adapter } from '../../../core/adapters/s3.adapter.js';
import { UploadFileContract } from '../../../../../../libs/contracts/index.js';
import { File, FileDocument, FileType } from '../schemas/files.schema.js';
import { ImageProcessingService } from './image-processing.service.js';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    private readonly s3: S3Adapter,
    private readonly imageProcessing: ImageProcessingService,
  ) {}

  async saveFile(file: UploadFileContract, type: FileType) {
    const processed = await this.imageProcessing.process(file, type);
    const fileId = crypto.randomUUID();
    const fileData = {
      fileId,
      type,
      originalName: file.originalName,
      key: `files/${type}/${fileId}.${processed.format}`,
      size: processed.size,
      width: processed.width,
      height: processed.height,
      format: processed.format,
    };

    await this.s3.uploadFile(fileData.key, processed.buffer, processed.format);

    return this.fileModel.create(fileData);
  }

  validateFileSize(size: number): boolean {
    return size <= 5 * 1024 * 1024;
  }
}
