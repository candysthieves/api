import { Controller } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UploadPostFilesCommand } from '../application/use-cases/upload-post-files.usecase.js';
import { FileType } from '../schemas/files.schema.js';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UploadFilesDto } from './dto/upload-files.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { UploadAvatarCommand } from '../application/use-cases/upload-avatar.usecase.js';

@Controller('upload')
export class FilesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @MessagePattern({ cmd: 'upload-post-files' })
  async uploadPostFiles(@Payload() dto: UploadFilesDto) {
    await this.commandBus.execute<UploadPostFilesCommand, void>(
      new UploadPostFilesCommand(dto.files, FileType.POST),
    );
  }

  @MessagePattern({ cmd: 'upload-avatar-file' })
  async uploadAvatarFile(@Payload() dto: UploadFileDto) {
    await this.commandBus.execute<UploadAvatarCommand, void>(
      new UploadAvatarCommand(dto, FileType.AVATAR),
    );
  }
}
