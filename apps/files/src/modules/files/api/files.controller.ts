import { Controller, UseFilters, UsePipes } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SoftDeleteFilesCommand } from '../application/use-cases/soft-delete-files.usecase.js';
import { ObjectResult } from '../../../core/object-result.js';
import { FilesResultType } from './view-types/files-result.type.js';
import { DeleteFilesCommand } from '../application/use-cases/delete-files.usecase.js';
import { RestoreFilesCommand } from '../application/use-cases/restore-files.usecase.js';
import { FileType } from '../schemas/files.schema.js';
import { UploadFilesContract } from './contracts/upload-files.contract.js';
import { UploadFileContract } from './contracts/upload-file.contract.js';
import { DeleteFilesContract } from './contracts/delete-files.contract.js';
import { RestoreFilesContract } from './contracts/restore-files.contract.js';
import { PostMediaProcessingService } from '../application/post-media-processing.service.js';
import { UploadFileCommand } from '../application/use-cases/upload-file-use.case.js';
import { UploadFilesCommand } from '../application/use-cases/upload-files-use.case.js';
import { RpcValidationPipe } from '../../../core/pipes/rpc-validation.pipe.js';
import { ValidationRpcExceptionFilter } from '../../../core/filters/validation-rpc-exception.filter.js';

@UsePipes(RpcValidationPipe())
@UseFilters(ValidationRpcExceptionFilter)
@Controller('upload')
export class FilesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly postMediaProcessing: PostMediaProcessingService,
  ) {}

  @MessagePattern({ cmd: 'upload-post-files' })
  async uploadPostFiles(@Payload() dto: UploadFilesContract) {
    return this.postMediaProcessing.accept(dto.files);
    return this.commandBus.execute<
      UploadFilesCommand,
      ObjectResult<FilesResultType | null>
    >(new UploadFilesCommand(dto.files, FileType.POST));
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
}
