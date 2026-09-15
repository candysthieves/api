import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { File, FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { FileMapper } from '../../api/mappers/file.mapper.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';
import { FilesResultType } from '../../api/view-types/files-result.type.js';
import { UploadFileContract } from '../../../../../../../libs/contracts/index.js';

export class UploadFilesCommand {
  constructor(
    public readonly files: UploadFileContract[],
    public readonly type: FileType,
  ) {}
}

@CommandHandler(UploadFilesCommand)
export class UploadFilesUseCase implements ICommandHandler<
  UploadFilesCommand,
  ObjectResult<FilesResultType | null>
> {
  constructor(
    private readonly fileService: FilesService,
    private readonly s3: S3Adapter,
  ) {}

  async execute({
    files,
    type,
  }: UploadFilesCommand): Promise<ObjectResult<FilesResultType | null>> {
    for (const [index, file] of files.entries()) {
      const isSizeValid = this.fileService.validateFileSize(file.size);

      if (!isSizeValid) {
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

      const isFormatValid = this.fileService.validateFormat(
        file.mimeType,
        file.originalName,
      );

      if (!isFormatValid) {
        return ObjectResult.failure({
          code: 'INVALID_FILE',
          errors: [
            {
              field: `file[${index}]`,
              message: 'Invalid image file. Only JPEG, JPG and PNG are allowed',
            },
          ],
        });
      }

      const isBufferValid = await this.fileService.validateImageBuffer(
        file.buffer,
      );

      if (!isBufferValid) {
        return ObjectResult.failure({
          code: 'INVALID_FILE',
          errors: [
            {
              field: `file[${index}]`,
              message: 'Corrupted or unreadable image file',
            },
          ],
        });
      }
    }

    const result: File[] = [];

    try {
      for (const file of files) {
        result.push(await this.fileService.saveFile(file, type));
      }

      const preview = await this.fileService.saveFile(
        files[0],
        `${type}_PREVIEW` as FileType,
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
    } catch (error) {
      return ObjectResult.failure({
        code: 'IMAGE_PROCESSING_FAILED',
        errors: [
          {
            field: 'files',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to process images',
          },
        ],
      });
    }
  }
}
