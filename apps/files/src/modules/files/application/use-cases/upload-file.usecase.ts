import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { File, FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';

export class UploadFileCommand {
  constructor(
    public readonly file: Express.Multer.File,
    public type: FileType,
  ) {}
}

@CommandHandler(UploadFileCommand)
export class UploadFileUseCase implements ICommandHandler<UploadFileCommand> {
  constructor(private readonly fileService: FilesService) {}

  async execute({ file, type }: UploadFileCommand) {
    // if (fileMaxSIze && file.size >= fileMaxSIze) {
    //   //file ERROR 'Maximum file size is 5MB'
    // }

    await this.fileService.saveFile(file, type);

    await this.fileService.saveFile(file, FileType.AVATAR_SMALL);
  }
}
