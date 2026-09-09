import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { FileMapper } from '../../api/mappers/file.mapper.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';
import { FilesResultType } from '../../api/view-types/files-result.type.js';
import { UploadFileContract } from '../../../../../../../libs/contracts/index.js';

export class UploadFileCommand {
  constructor(
    public readonly file: UploadFileContract,
    public readonly type: FileType,
  ) {}
}

@CommandHandler(UploadFileCommand)
export class UploadFileUseCase implements ICommandHandler<
  UploadFileCommand,
  ObjectResult<FilesResultType | null>
> {
  constructor(
    private readonly fileService: FilesService,
    private readonly s3: S3Adapter,
  ) {}

  async execute({
    file,
    type,
  }: UploadFileCommand): Promise<ObjectResult<FilesResultType | null>> {
    const isSizeValid = this.fileService.validateFileSize(file.size);

    if (!isSizeValid) {
      return ObjectResult.failure({
        code: 'FILE_SIZE_EXCEEDED',
        errors: [
          {
            field: 'file',
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
            field: 'file',
            message: 'Invalid image file. Only JPEG, JPG and PNG are allowed',
          },
        ],
      });
    }

    const avatar = await this.fileService.saveFile(file, type);

    const avatarPreview = await this.fileService.saveFile(
      file,
      `${type}_PREVIEW` as FileType,
    );

    const resultAvatar = FileMapper.toFileView(
      avatar,
      this.s3.getUrl(avatar.key),
    );

    const resultAvatarPreview = FileMapper.toFileView(
      avatarPreview,
      this.s3.getUrl(avatarPreview.key),
    );

    return ObjectResult.success(
      FileMapper.toFilesResult(
        file.targetId,
        [resultAvatar],
        resultAvatarPreview,
      ),
    );
  }
}
