import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { File, FileDocument, FileType } from '../../schemas/files.schema.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';

export class CleanupUnusedPostFilesCommand {
  constructor(
    public readonly activeFileIds: string[],
    public readonly olderThanHours: number = 24,
  ) {}
}

export type CleanupResult = {
  deletedDbCount: number;
  deletedS3OrphanCount: number;
};

@CommandHandler(CleanupUnusedPostFilesCommand)
export class CleanupUnusedPostFilesUseCase implements ICommandHandler<
  CleanupUnusedPostFilesCommand,
  ObjectResult<CleanupResult>
> {
  private readonly logger = new Logger(CleanupUnusedPostFilesUseCase.name);

  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    private readonly s3: S3Adapter,
  ) {}

  async execute(
    command: CleanupUnusedPostFilesCommand,
  ): Promise<ObjectResult<CleanupResult>> {
    const hours = command.olderThanHours || 24;
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    this.logger.log(
      `Starting cleanup for files older than ${hours}h (${cutoffDate.toISOString()})`,
    );

    // 1. Удаляем файлы, которые есть в Mongo, но отсутствуют в постах Postgres
    const deletedDbCount = await this.cleanUnusedDbFiles(
      command.activeFileIds,
      cutoffDate,
    );

    // 2. Удаляем файлы из S3, про которые вообще нет записей в Mongo
    const deletedS3OrphanCount = await this.cleanOrphanS3Files(cutoffDate);

    this.logger.log(
      `Cleanup finished: ${deletedDbCount} db files removed, ${deletedS3OrphanCount} s3 orphans removed.`,
    );

    return ObjectResult.success({ deletedDbCount, deletedS3OrphanCount });
  }

  /**
   * Шаг 1: Находит в MongoDB файлы постов старше 24ч, которых нет в Postgres,
   * и удаляет их из S3 и MongoDB.
   */
  private async cleanUnusedDbFiles(
    activeFileIds: string[],
    cutoffDate: Date,
  ): Promise<number> {
    const unusedFiles = await this.fileModel.find({
      type: { $in: [FileType.POST, FileType.POST_PREVIEW] },
      createdAt: { $lt: cutoffDate },
      fileId: { $nin: activeFileIds },
    });

    let count = 0;
    for (const file of unusedFiles) {
      try {
        await this.s3.deleteFile(file.key);
        await file.deleteOne();
        count++;
      } catch (err) {
        this.logger.error(`Failed to delete file ${file.key}:`, err);
      }
    }
    return count;
  }

  /**
   * Шаг 2: Сканирует папки постов в S3 и удаляет те объекты старше 24ч,
   * которых вообще нет в MongoDB.
   */
  private async cleanOrphanS3Files(cutoffDate: Date): Promise<number> {
    const folders = [
      `files/${FileType.POST}/`,
      `files/${FileType.POST_PREVIEW}/`,
    ];
    let count = 0;

    for (const prefix of folders) {
      try {
        const s3Objects = await this.s3.listObjects(prefix);

        for (const item of s3Objects) {
          // Проверяем только файлы старше 24ч
          if (!item.lastModified || item.lastModified >= cutoffDate) continue;

          // Есть ли такой файл в Mongo?
          const exists = await this.fileModel.exists({ key: item.key });
          if (!exists) {
            await this.s3.deleteFile(item.key);
            count++;
          }
        }
      } catch (err) {
        this.logger.error(`Failed to scan S3 prefix ${prefix}:`, err);
      }
    }
    return count;
  }
}
