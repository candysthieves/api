import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { File, FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { UploadFileDto } from '../../api/dto/upload-file.dto.js';

export class UploadPostFilesCommand {
  constructor(
    public readonly files: UploadFileDto[],
    public readonly type: FileType.POST,
  ) {}
}

@CommandHandler(UploadPostFilesCommand)
export class UploadPostFilesUseCase implements ICommandHandler<UploadPostFilesCommand> {
  constructor(private readonly fileService: FilesService) {}

  async execute({
    files,
    type,
  }: UploadPostFilesCommand): Promise<ObjectResult<File[] | null>> {
    for (const file of files) {
      const fileResult = this.fileService.validateFileSize(file.size);

      if (fileResult.error) {
        return ObjectResult.failure(fileResult.error);
      }
    }

    const result: File[] = [];

    for (const [index, file] of files.entries()) {
      result.push(await this.fileService.saveFile(file, type));

      if (index === 0 && type === FileType.POST) {
        result.push(
          await this.fileService.saveFile(file, FileType.POST_PREVIEW),
        );
      }
    }

    return ObjectResult.success(result);
  }
}
