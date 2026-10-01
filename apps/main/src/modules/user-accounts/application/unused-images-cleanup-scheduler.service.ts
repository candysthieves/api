import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { FilesTcpClient } from '../../../core/events/files-tcp.client.js';
import { PostsRepository } from '../infrastructure/repositories/post-repositories/posts.repository.js';
import { AppConfig } from '../../../app.config.js';
import { UsersRepository } from '../infrastructure/repositories/user-repositories/users.repository.js';

// Запуск раз в 24 часа
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class UnusedImagesCleanupSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    UnusedImagesCleanupSchedulerService.name,
  );
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly filesClient: FilesTcpClient,
    private readonly appConfig: AppConfig,
  ) {}

  onModuleInit(): void {
    if (!this.appConfig.unusedFilesCleanupEnabled) {
      this.logger.log(
        'Unused post images cleanup scheduler is disabled (UNUSED_FILES_CLEANUP_ENABLED is not true).',
      );
      return;
    }

    this.logger.log('Unused post images cleanup scheduler is enabled.');
    // Запускаем шедулер каждые 24 часа
    this.timer = setInterval(() => void this.run(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.logger.log('Running daily cleanup of unused post images...');

      // 1. Получаем все fileId картинок, привязанных к постам в Postgres
      const activeIds =
        await this.postsRepository.getAllActivePostMediaFileIds();

      // 2. Отправляем в сервис файлов команду на очистку
      const result = await this.filesClient.cleanupUnusedPostFiles(
        activeIds,
        24,
      );

      if (result.error) {
        this.logger.error('Cleanup failed:', result.error);
      } else {
        const { deletedDbCount = 0, deletedS3OrphanCount = 0 } =
          result.data || {};
        this.logger.log(
          `Cleanup completed successfully: deleted ${deletedDbCount} unused files and ${deletedS3OrphanCount} orphan S3 objects.`,
        );
      }

      const activeAvatarIds =
        await this.usersRepository.getAllActiveAvatarFileIds();
      const avatarResult = await this.filesClient.cleanupUnusedAvatarFiles(
        activeAvatarIds,
        24,
      );
      if (avatarResult.error) {
        this.logger.error('Avatar cleanup failed:', avatarResult.error);
      } else {
        const { deletedDbCount = 0, deletedS3OrphanCount = 0 } =
          avatarResult.data || {};
        this.logger.log(
          `Avatar cleanup completed successfully: deleted ${deletedDbCount} unused files and ${deletedS3OrphanCount} orphan S3 objects.`,
        );
      }
    } catch (error) {
      this.logger.error('Error during unused images cleanup:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
