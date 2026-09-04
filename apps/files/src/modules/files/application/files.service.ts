import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { S3Adapter } from '../../../core/adapters/s3.adapter.js';
import { File, FileDocument, FileType } from '../schemas/files.schema.js';
import { ImageProcessingService } from './image-processing.service.js';
import { UploadFileContract } from '@libs/contracts';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    private readonly s3: S3Adapter,
    private readonly imageProcessing: ImageProcessingService,
  ) {}

  async saveFile(file: UploadFileContract, type: FileType) {
    const startedAt = Date.now();
    let phase = 'image_processing';
    this.logger.log(
      JSON.stringify({
        event: 'file_save_started',
        postId: file.targetId,
        type,
        sourceSizeBytes: file.size,
      }),
    );

    try {
      const imageProcessingStartedAt = Date.now();
      const processed = await this.imageProcessing.process(file, type);
      this.logger.log(
        JSON.stringify({
          event: 'file_image_processed',
          durationMs: Date.now() - imageProcessingStartedAt,
          postId: file.targetId,
          type,
          sourceSizeBytes: file.size,
          processedSizeBytes: processed.size,
          width: processed.width,
          height: processed.height,
          format: processed.format,
        }),
      );

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

      phase = 's3_upload';
      const s3UploadStartedAt = Date.now();
      await this.s3.uploadFile(
        fileData.key,
        processed.buffer,
        processed.format,
      );
      this.logger.log(
        JSON.stringify({
          event: 'file_s3_upload_completed',
          durationMs: Date.now() - s3UploadStartedAt,
          postId: file.targetId,
          type,
          fileId,
          sizeBytes: processed.size,
        }),
      );

      phase = 'mongo_file_create';
      const mongoCreateStartedAt = Date.now();
      const savedFile = await this.fileModel.create(fileData);
      this.logger.log(
        JSON.stringify({
          event: 'file_save_completed',
          durationMs: Date.now() - startedAt,
          mongoDurationMs: Date.now() - mongoCreateStartedAt,
          postId: file.targetId,
          type,
          fileId,
        }),
      );
      return savedFile;
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'file_save_failed',
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startedAt,
          phase,
          postId: file.targetId,
          type,
        }),
      );
      throw error;
    }
  }

  validateFileSize(size: number): boolean {
    return size <= 5 * 1024 * 1024;
  }
}
