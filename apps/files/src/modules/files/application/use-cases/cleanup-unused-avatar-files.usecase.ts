import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectResult } from '../../../../core/object-result.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';
import { File, FileDocument, FileType } from '../../schemas/files.schema.js';

export class CleanupUnusedAvatarFilesCommand {
  constructor(
    public readonly activeFileIds: string[],
    public readonly olderThanHours = 24,
  ) {}
}
export type AvatarCleanupResult = {
  deletedDbCount: number;
  deletedS3OrphanCount: number;
};

@CommandHandler(CleanupUnusedAvatarFilesCommand)
export class CleanupUnusedAvatarFilesUseCase implements ICommandHandler<
  CleanupUnusedAvatarFilesCommand,
  ObjectResult<AvatarCleanupResult>
> {
  private readonly logger = new Logger(CleanupUnusedAvatarFilesUseCase.name);
  constructor(
    @InjectModel(File.name) private readonly files: Model<FileDocument>,
    private readonly s3: S3Adapter,
  ) {}
  async execute(
    command: CleanupUnusedAvatarFilesCommand,
  ): Promise<ObjectResult<AvatarCleanupResult>> {
    const cutoff = new Date(
      Date.now() - (command.olderThanHours || 24) * 3_600_000,
    );
    let deletedDbCount = 0;
    const oldFiles = await this.files.find({
      type: { $in: [FileType.AVATAR, FileType.AVATAR_PREVIEW] },
      createdAt: { $lt: cutoff },
      fileId: { $nin: command.activeFileIds },
    });
    for (const file of oldFiles)
      try {
        await this.s3.deleteFile(file.key);
        await file.deleteOne();
        deletedDbCount++;
      } catch (error) {
        this.logger.error(`Failed to delete avatar file ${file.key}`, error);
      }
    let deletedS3OrphanCount = 0;
    for (const type of [FileType.AVATAR, FileType.AVATAR_PREVIEW]) {
      const prefix = `files/${type}/`;
      try {
        for (const item of await this.s3.listObjects(prefix)) {
          if (
            !item.lastModified ||
            item.lastModified >= cutoff ||
            (await this.files.exists({ key: item.key }))
          )
            continue;
          await this.s3.deleteFile(item.key);
          deletedS3OrphanCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to scan avatar S3 prefix ${prefix}`, error);
      }
    }
    return ObjectResult.success({ deletedDbCount, deletedS3OrphanCount });
  }
}
