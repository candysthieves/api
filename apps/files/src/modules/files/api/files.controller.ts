import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { UploadPostFilesCommand } from '../application/use-cases/upload-post-files.usecase.js';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UploadAvatarCommand } from '../application/use-cases/upload-avatar.usecase.js';
import { SoftDeleteFilesCommand } from '../application/use-cases/soft-delete-files.usecase.js';
import { ObjectResult } from '../../../core/object-result.js';
import { FilesResultType } from './view-types/files-result.type.js';
import { DeleteFilesCommand } from '../application/use-cases/delete-files.usecase.js';
import { UploadFilesContract } from './contracts/upload-files.contract.js';
import { UploadFileContract } from './contracts/upload-file.contract.js';
import { DeleteFilesContract } from './contracts/delete-files.contract.js';
import { RestoreFilesCommand } from '../application/use-cases/restore-files.usecase.js';
import { RestoreFilesContract } from './contracts/restore-files.contract.js';

@Controller('upload')
export class FilesController {
  constructor(private readonly commandBus: CommandBus) {}

  @MessagePattern({ cmd: 'upload-post-files' })
  async uploadPostFiles(@Payload() dto: UploadFilesContract) {
    return this.commandBus.execute<
      UploadPostFilesCommand,
      ObjectResult<FilesResultType | null>
    >(new UploadPostFilesCommand(dto.files));
  }

  @MessagePattern({ cmd: 'upload-avatar-file' })
  async uploadAvatarFile(@Payload() dto: UploadFileContract) {
    return this.commandBus.execute<
      UploadAvatarCommand,
      ObjectResult<FilesResultType | null>
    >(new UploadAvatarCommand(dto));
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
