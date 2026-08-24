import { Module } from '@nestjs/common';
import { FilesController } from './api/files.controller.js';
import { FilesService } from './application/files.service.js';
import { UploadFilesUseCase } from './application/use-cases/upload-files.usecase.js';
import { MongooseModule } from '@nestjs/mongoose';
import { FileSchema, File } from './schemas/files.schema.js';
import { S3Adapter } from './adapters/s3.adapter.js';
import { FilesConfig } from '../../files.config.js';
import { GetFilesQueryHandler } from './application/use-cases/get-files.usecase.js';
import { UploadFileUseCase } from './application/use-cases/upload-file.usecase.js';

const useCases = [UploadFilesUseCase, UploadFileUseCase];

const queryHandlers = [GetFilesQueryHandler];

@Module({
  imports: [
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
  ],
  controllers: [FilesController],
  providers: [
    ...useCases,
    ...queryHandlers,
    FilesService,
    S3Adapter,
    FilesConfig,
  ],
})
export class FilesModule {}
