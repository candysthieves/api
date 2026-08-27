import { Module } from '@nestjs/common';
import { FilesController } from './api/files.controller.js';
import { FilesService } from './application/files.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { FileSchema, File } from './schemas/files.schema.js';
import { S3Adapter } from '../../core/adapters/s3.adapter.js';
import { FilesConfig } from '../../files.config.js';
import { UploadAvatarUseCase } from './application/use-cases/upload-avatar.usecase.js';
import { UploadPostFilesUseCase } from './application/use-cases/upload-post-files.usecase.js';
import { SoftDeleteFilesUseCase } from './application/use-cases/soft-delete-files.usecase.js';
import { DeleteFilesUseCase } from './application/use-cases/delete-files.usecase.js';
import { RestoreFilesUseCase } from './application/use-cases/restore-files.usecase.js';

const useCases = [
  UploadPostFilesUseCase,
  UploadAvatarUseCase,
  SoftDeleteFilesUseCase,
  DeleteFilesUseCase,
  RestoreFilesUseCase,
];

@Module({
  imports: [
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
  ],
  controllers: [FilesController],
  providers: [...useCases, FilesService, S3Adapter, FilesConfig],
})
export class FilesModule {}
