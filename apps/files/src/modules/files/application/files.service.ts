import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import sharp from 'sharp';
import { S3Adapter } from '../../../core/adapters/s3.adapter.js';
import { File, FileDocument, FileType } from '../schemas/files.schema.js';
import { ImageProcessingService } from './image-processing.service.js';
import { UploadFileContract } from '../../../../../../libs/contracts/index.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    private readonly s3: S3Adapter,
    private readonly imageProcessing: ImageProcessingService,
  ) {}

  async saveFile(
    file: UploadFileContract,
    type: FileType,
  ): Promise<FileDocument> {
    const processed = await this.imageProcessing.process(file, type);
    const fileId = randomUUID();
    const key = `files/${type}/${fileId}.${processed.format}`;
    await this.s3.uploadFile(key, processed.buffer, processed.format);

    return await this.fileModel.create({
      fileId,
      type,
      originalName: file.originalName,
      key,
      size: processed.size,
      width: processed.width,
      height: processed.height,
      format: processed.format,
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = await this.fileModel.findOne({ fileId });
    if (!file) return;
    await this.s3.deleteFile(file.key);
    await file.deleteOne();
  }

  validateFileSize(size: number): boolean {
    return size <= 5 * 1024 * 1024;
  }

  validateFormat(mimeType: string, originalName?: string): boolean {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const hasValidMime = allowedMimeTypes.includes(mimeType?.toLowerCase());
    if (originalName) {
      const ext = originalName.toLowerCase().split('.').pop();
      const allowedExts = ['jpg', 'jpeg', 'png'];
      return hasValidMime && !!ext && allowedExts.includes(ext);
    }
    return hasValidMime;
  }

  async validateImageBuffer(buffer?: Buffer): Promise<boolean> {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return false;
    }

    try {
      const metadata = await sharp(buffer).metadata();

      const allowedFormats = ['jpeg', 'jpg', 'png'];
      const isAllowedFormat =
        !!metadata.format && allowedFormats.includes(metadata.format);
      const hasValidDimensions =
        (metadata.width ?? 0) > 0 && (metadata.height ?? 0) > 0;

      return isAllowedFormat && hasValidDimensions;
    } catch {
      return false;
    }
  }
}
