import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
export const FILES_TCP_CLIENT = 'FILES_TCP_CLIENT';

export type FilesDeletionResult = {
  data: null;
  error: { code: string; errors: { field: string; message: string }[] } | null;
};

type FilesCleanupResult = {
  data: { deletedDbCount: number; deletedS3OrphanCount: number } | null;
  error: FilesDeletionResult['error'];
};

@Injectable()
export class FilesTcpClient {
  constructor(
    @Inject(FILES_TCP_CLIENT) private readonly fileMKSClient: ClientProxy,
  ) {}
  async deletePostMedia(
    images: unknown,
    preview: unknown,
  ): Promise<FilesDeletionResult> {
    for (const fileIds of [getFileIds(images), getFileIds(preview)]) {
      if (!fileIds.length) continue;

      const result = await lastValueFrom(
        this.fileMKSClient
          .send<FilesDeletionResult>({ cmd: 'delete-files' }, { fileIds })
          .pipe(timeout(15_000)),
      );
      if (result.error) return result;
    }

    return { data: null, error: null };
  }

  async cleanupUnusedPostFiles(
    activeFileIds: string[],
    olderThanHours = 24,
  ): Promise<FilesCleanupResult> {
    return lastValueFrom(
      this.fileMKSClient
        .send<FilesCleanupResult>(
          { cmd: 'cleanup-unused-post-files' },
          { activeFileIds, olderThanHours },
        )
        .pipe(timeout(60_000)),
    );
  }

  async cleanupUnusedAvatarFiles(
    activeFileIds: string[],
    olderThanHours = 24,
  ): Promise<FilesCleanupResult> {
    return lastValueFrom(
      this.fileMKSClient
        .send<FilesCleanupResult>(
          { cmd: 'cleanup-unused-avatar-files' },
          { activeFileIds, olderThanHours },
        )
        .pipe(timeout(60_000)),
    );
  }
}

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
