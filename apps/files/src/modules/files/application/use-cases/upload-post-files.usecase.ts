import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { File, FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { UploadFileDto } from '../../api/dto/upload-file.dto.js';
import { FileMapper } from '../../api/mappers/file.mapper.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';

export class UploadPostFilesCommand {
  constructor(
    public readonly files: UploadFileDto[],
    public readonly type: FileType,
  ) {}
}

@CommandHandler(UploadPostFilesCommand)
export class UploadPostFilesUseCase implements ICommandHandler<UploadPostFilesCommand> {
  constructor(
    private readonly fileService: FilesService,
    private readonly s3: S3Adapter,
  ) {}

  async execute({ files, type }: UploadPostFilesCommand) {
    for (const file of files) {
      const fileResult = this.fileService.validateFileSize(file.size);

      if (fileResult.error) {
        return ObjectResult.failure(fileResult.error);
      }
    }

    const result: File[] = [];

    for (const file of files) {
      const savedFile = await this.fileService.saveFile(file, type);
      result.push(savedFile);
    }

    const preview = await this.fileService.saveFile(
      files[0],
      FileType.POST_PREVIEW,
    );

    const filesView = result.map((file) =>
      FileMapper.toFileView(file, this.s3.getUrl(file.key)),
    );

    const previewView = FileMapper.toFileView(
      preview,
      this.s3.getUrl(preview.key),
    );

    return FileMapper.toFilesResult(files[0].targetId, filesView, previewView);
  }
}
