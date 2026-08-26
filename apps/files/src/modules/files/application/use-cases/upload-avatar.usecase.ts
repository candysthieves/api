import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { File, FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { UploadFileDto } from '../../api/dto/upload-file.dto.js';
import { FileMapper } from '../../api/mappers/file.mapper.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';
import { FilesResultType } from '../../api/view-types/files-result.type.js';

export class UploadAvatarCommand {
  constructor(
    public readonly file: UploadFileDto,
    public readonly type: FileType,
  ) {}
}

@CommandHandler(UploadAvatarCommand)
export class UploadAvatarUseCase implements ICommandHandler<UploadAvatarCommand> {
  constructor(
    private readonly fileService: FilesService,
    private readonly s3: S3Adapter,
  ) {}

  async execute({
    file,
    type,
  }: UploadAvatarCommand): Promise<ObjectResult<FilesResultType | null>> {
    const fileResult = this.fileService.validateFileSize(file.size);

    if (fileResult.error) {
      return ObjectResult.failure(fileResult.error);
    }

    const avatar = await this.fileService.saveFile(file, type);

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
