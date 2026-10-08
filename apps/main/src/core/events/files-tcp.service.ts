import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
export const FILES_TCP_SERVICE = 'FILES_TCP_SERVICE';

export type FilesDeletionResult = {
  data: null;
  error: { code: string; errors: { field: string; message: string }[] } | null;
};

type FilesCleanupResult = {
  data: { deletedDbCount: number; deletedS3OrphanCount: number } | null;
  error: FilesDeletionResult['error'];
};

@Injectable()
export class FilesTcpService {
  // Подключает TCP-клиент приложения files.
  constructor(
    @Inject(FILES_TCP_SERVICE) private readonly filesClient: ClientProxy,
  ) {}

  // Удаляет файлы поста и его превью.
  async deletePostMedia(
    images: unknown,
    preview: unknown,
  ): Promise<FilesDeletionResult> {
    for (const media of [images, preview]) {
      const fileIds = getFileIds(media);
      if (!fileIds.length) continue;

      const result = await this.send<FilesDeletionResult>(
        'delete-files',
        { fileIds },
        15_000,
      );
      if (result.error) return result;
    }

    return { data: null, error: null };
  }

  // Удаляет файлы по их идентификаторам.
  async deleteFiles(fileIds: string[]): Promise<FilesDeletionResult> {
    if (!fileIds.length) return { data: null, error: null };

    return this.send<FilesDeletionResult>('delete-files', { fileIds }, 15_000);
  }

  // Очищает неиспользуемые файлы постов.
  async cleanupUnusedPostFiles(
    activeFileIds: string[],
    olderThanHours = 24,
  ): Promise<FilesCleanupResult> {
    return this.cleanupUnusedFiles(
      'cleanup-unused-post-files',
      activeFileIds,
      olderThanHours,
    );
  }

  // Очищает неиспользуемые файлы аватаров.
  async cleanupUnusedAvatarFiles(
    activeFileIds: string[],
    olderThanHours = 24,
  ): Promise<FilesCleanupResult> {
    return this.cleanupUnusedFiles(
      'cleanup-unused-avatar-files',
      activeFileIds,
      olderThanHours,
    );
  }

  // Общая отправка TCP-запроса с таймаутом.
  private send<T>(
    cmd: string,
    payload: unknown,
    timeoutMs: number,
  ): Promise<T> {
    return lastValueFrom(
      this.filesClient
        .send<T>({ cmd }, payload)
        .pipe(timeout(timeoutMs)),
    );
  }

  // Выполняет общую команду очистки файлов.
  private cleanupUnusedFiles(
    cmd: string,
    activeFileIds: string[],
    olderThanHours: number,
  ): Promise<FilesCleanupResult> {
    return this.send<FilesCleanupResult>(
      cmd,
      { activeFileIds, olderThanHours },
      60_000,
    );
  }
}

// Извлекает fileId из одного файла или массива файлов.
export function getFileIds(value: unknown): string[] {
  const media: unknown[] = Array.isArray(value) ? value : [value];

  return media.flatMap((file): string[] => {
    if (
      typeof file === 'object' &&
      file !== null &&
      'fileId' in file &&
      typeof file.fileId === 'string'
    ) {
      return [file.fileId];
    }
    return [];
  });
}
