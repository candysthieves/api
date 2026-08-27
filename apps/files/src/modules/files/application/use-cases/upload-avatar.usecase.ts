import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { File, FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { UploadFileContract } from '../../api/contracts/upload-file.contract.js';
import { FileMapper } from '../../api/mappers/file.mapper.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';
import { FilesResultType } from '../../api/view-types/files-result.type.js';

export class UploadAvatarCommand {
  constructor(public readonly file: UploadFileContract) {}
}

@CommandHandler(UploadAvatarCommand)
export class UploadAvatarUseCase implements ICommandHandler<
  UploadAvatarCommand,
  ObjectResult<FilesResultType | null>
> {
  constructor(
    private readonly fileService: FilesService,
    private readonly s3: S3Adapter,
  ) {}

  async execute({
    file,
  }: UploadAvatarCommand): Promise<ObjectResult<FilesResultType | null>> {
    const isValid: boolean = this.fileService.validateFileSize(file.size);

    if (!isValid) {
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

    const avatar = await this.fileService.saveFile(file, FileType.AVATAR);

    const avatarPreview = await this.fileService.saveFile(
      file,
      FileType.AVATAR_PREVIEW,
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
