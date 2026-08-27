import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { File, FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { FileMapper } from '../../api/mappers/file.mapper.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';
import { FilesResultType } from '../../api/view-types/files-result.type.js';
import { UploadFileContract } from '../../api/contracts/upload-file.contract.js';

export class UploadPostFilesCommand {
  constructor(public readonly files: UploadFileContract[]) {}
}

@CommandHandler(UploadPostFilesCommand)
export class UploadPostFilesUseCase implements ICommandHandler<
  UploadPostFilesCommand,
  ObjectResult<FilesResultType | null>
> {
  constructor(
    private readonly fileService: FilesService,
    private readonly s3: S3Adapter,
  ) {}

  async execute({
    files,
  }: UploadPostFilesCommand): Promise<ObjectResult<FilesResultType | null>> {
    for (const [index, file] of files.entries()) {
      const isValid: boolean = this.fileService.validateFileSize(file.size);

      if (!isValid) {
        return ObjectResult.failure({
          code: 'FILE_SIZE_EXCEEDED',
          errors: [
            {
              field: `file[${index}]`,
              message: 'File size must not exceed 5 MB',
            },
          ],
        });
      }
    }

    const result: File[] = [];

    for (const file of files) {
      const savedFile = await this.fileService.saveFile(file, FileType.POST);
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

    return ObjectResult.success(
      FileMapper.toFilesResult(files[0].targetId, filesView, previewView),
    );
  }
}
