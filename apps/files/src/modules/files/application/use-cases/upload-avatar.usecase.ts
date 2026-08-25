import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { File, FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { UploadFileDto } from '../../api/dto/upload-file.dto.js';

export class UploadAvatarCommand {
  constructor(
    public readonly file: UploadFileDto,
    public readonly type: FileType,
  ) {}
}

@CommandHandler(UploadAvatarCommand)
export class UploadAvatarUseCase implements ICommandHandler<UploadAvatarCommand> {
  constructor(private readonly fileService: FilesService) {}

  async execute({
    file,
    type,
  }: UploadAvatarCommand): Promise<ObjectResult<File[] | null>> {
    const fileResult = this.fileService.validateFileSize(file.size);

    if (fileResult.error) {
      return ObjectResult.failure(fileResult.error);
    }

    const result: File[] = [];

    result.push(await this.fileService.saveFile(file, type));

    result.push(await this.fileService.saveFile(file, FileType.AVATAR_SMALL));

    return ObjectResult.success(result);
  }
}
