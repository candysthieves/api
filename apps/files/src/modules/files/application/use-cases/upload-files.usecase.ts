import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { File, FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';

export class UploadFilesCommand {
  constructor(
    public readonly files: Express.Multer.File[],
    public type: FileType,
  ) {}
}

@CommandHandler(UploadFilesCommand)
export class UploadFilesUseCase implements ICommandHandler<UploadFilesCommand> {
  constructor(private readonly fileService: FilesService) {}

  async execute({ files, type }: UploadFilesCommand) {
    // if (fileMaxSIze && file.size >= fileMaxSIze) {
    //   //file ERROR 'Maximum file size is 5MB'
    // }

    const result: File[] = [];

    for (const [index, file] of files.entries()) {
      const savedFile = await this.fileService.saveFile(file, type);

      if (index === 0) {
        await this.fileService.saveFile(file, FileType.POST_PREVIEW);
      }

      result.push(savedFile);
    }
    return result;
  }
}
