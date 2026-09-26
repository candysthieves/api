import { FilesEventsModule } from '../../events/files-events.module.js';
import { Module } from '@nestjs/common';
import { FilesController } from './api/files.controller.js';
import { FilesService } from './application/files.service.js';
import { ImageProcessingService } from './application/image-processing.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { FileSchema, File } from './schemas/files.schema.js';
import { S3Adapter } from '../../core/adapters/s3.adapter.js';
import { FilesConfig } from '../../files.config.js';
import { SoftDeleteFilesUseCase } from './application/use-cases/soft-delete-files.usecase.js';
import { DeleteFilesUseCase } from './application/use-cases/delete-files.usecase.js';
import { RestoreFilesUseCase } from './application/use-cases/restore-files.usecase.js';
import { UploadFileUseCase } from './application/use-cases/upload-file-use.case.js';
import { CleanupUnusedPostFilesUseCase } from './application/use-cases/cleanup-unused-post-files.usecase.js';
import { PostImageWorkerService } from './application/post-image-worker.service.js';
import { PostImageQueueService } from './application/post-image-queue.service.js';
import {
  CancelledPost,
  CancelledPostSchema,
} from './schemas/cancelled-post.schema.js';
import { CancelledPostRepository } from './application/cancelled-post.repository.js';
import { AvatarImageProcessingService } from './application/avatar-image-processing.service.js';
import { CleanupUnusedAvatarFilesUseCase } from './application/use-cases/cleanup-unused-avatar-files.usecase.js';

const useCases = [
  UploadFileUseCase,
  SoftDeleteFilesUseCase,
  DeleteFilesUseCase,
  RestoreFilesUseCase,
  CleanupUnusedPostFilesUseCase,
  CleanupUnusedAvatarFilesUseCase,
];

@Module({
  imports: [
    FilesEventsModule,
    MongooseModule.forFeature([
      { name: File.name, schema: FileSchema },
      {
        name: CancelledPost.name,
        schema: CancelledPostSchema,
      },
    ]),
  ],
  controllers: [FilesController],
  providers: [
    ...useCases,
    FilesService,
    ImageProcessingService,
    S3Adapter,
    FilesConfig,
    PostImageWorkerService,
    PostImageQueueService,
    CancelledPostRepository,
    AvatarImageProcessingService,
  ],
})
export class FilesModule {}
