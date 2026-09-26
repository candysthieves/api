import { Controller, UseFilters, UsePipes } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SoftDeleteFilesCommand } from '../application/use-cases/soft-delete-files.usecase.js';
import { ObjectResult } from '../../../core/object-result.js';
import { FilesResultType } from './view-types/files-result.type.js';
import { DeleteFilesCommand } from '../application/use-cases/delete-files.usecase.js';
import { RestoreFilesCommand } from '../application/use-cases/restore-files.usecase.js';
import { FileType } from '../schemas/files.schema.js';
import {
  CleanupUnusedPostFilesContract,
  DeleteFilesContract,
  RestoreFilesContract,
  UploadFileContract,
  CancelPostImagesContract,
} from '../../../../../../libs/contracts/index.js';
import {
  CleanupResult,
  CleanupUnusedPostFilesCommand,
} from '../application/use-cases/cleanup-unused-post-files.usecase.js';
import { UploadFileCommand } from '../application/use-cases/upload-file-use.case.js';
import { RpcValidationPipe } from '../../../core/pipes/rpc-validation.pipe.js';
import { ValidationRpcExceptionFilter } from '../../../core/filters/validation-rpc-exception.filter.js';
import { CancelledPostRepository } from '../application/cancelled-post.repository.js';
import { CleanupUnusedAvatarFilesCommand } from '../application/use-cases/cleanup-unused-avatar-files.usecase.js';
import type { CleanupUnusedAvatarFilesContract } from '../../../../../../libs/contracts/index.js';

@UsePipes(RpcValidationPipe())
@UseFilters(ValidationRpcExceptionFilter)
@Controller('upload')
export class FilesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly cancelledPosts: CancelledPostRepository,
  ) {}

  @MessagePattern({ cmd: 'cancel-post-images' })
  async cancelPostImages(@Payload() dto: CancelPostImagesContract) {
    await this.cancelledPosts.cancel(dto.postId);
    return ObjectResult.success(null);
  }

  @MessagePattern({ cmd: 'upload-avatar-file' })
  async uploadAvatarFile(
    @Payload()
    dto: UploadFileContract,
  ) {
    return this.commandBus.execute<
      UploadFileCommand,
      ObjectResult<FilesResultType | null>
    >(new UploadFileCommand(dto, FileType.AVATAR));
  }

  @MessagePattern({ cmd: 'soft-delete-files' })
  async softDeleteFiles(@Payload() dto: DeleteFilesContract) {
    return this.commandBus.execute<SoftDeleteFilesCommand, ObjectResult<null>>(
      new SoftDeleteFilesCommand(dto.fileIds),
    );
  }

  @MessagePattern({ cmd: 'delete-files' })
  async deleteFiles(@Payload() dto: DeleteFilesContract) {
    return this.commandBus.execute<DeleteFilesCommand, ObjectResult<null>>(
      new DeleteFilesCommand(dto.fileIds),
    );
  }

  @MessagePattern({ cmd: 'restore-files' })
  async restoreFiles(@Payload() dto: RestoreFilesContract) {
    return this.commandBus.execute<RestoreFilesCommand, ObjectResult<null>>(
      new RestoreFilesCommand(dto.fileIds),
    );
  }

  @MessagePattern({ cmd: 'cleanup-unused-post-files' })
  async cleanupUnusedPostFiles(@Payload() dto: CleanupUnusedPostFilesContract) {
    return this.commandBus.execute<
      CleanupUnusedPostFilesCommand,
      ObjectResult<CleanupResult>
    >(new CleanupUnusedPostFilesCommand(dto.activeFileIds, dto.olderThanHours));
  }

  @MessagePattern({ cmd: 'cleanup-unused-avatar-files' })
  async cleanupUnusedAvatarFiles(
    @Payload() dto: CleanupUnusedAvatarFilesContract,
  ) {
    return this.commandBus.execute(
      new CleanupUnusedAvatarFilesCommand(
        dto.activeFileIds,
        dto.olderThanHours,
      ),
    );
  }
}
