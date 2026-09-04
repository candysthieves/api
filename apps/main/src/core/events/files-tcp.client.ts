import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
export const FILES_TCP_CLIENT = 'FILES_TCP_CLIENT';
const LONG_FILES_RPC_TIMEOUT_MS = 60_000;
export type PostMediaJobAcceptance = {
  data: { accepted: true; eventId: string } | null;
  error: { code: string; errors: { field: string; message: string }[] } | null;
};

export type FilesDeletionResult = {
  data: null;
  error: { code: string; errors: { field: string; message: string }[] } | null;
};

@Injectable()
export class FilesTcpClient {
  private readonly logger = new Logger(FilesTcpClient.name);

  constructor(@Inject(FILES_TCP_CLIENT) private readonly client: ClientProxy) {}
  async uploadPostFiles(
    postId: string,
    files: Express.Multer.File[],
  ): Promise<PostMediaJobAcceptance> {
    const startedAt = Date.now();
    const totalSizeBytes = files.reduce((total, file) => total + file.size, 0);
    this.logger.log(
      JSON.stringify({
        event: 'files_upload_transport_started',
        postId,
        fileCount: files.length,
        totalSizeBytes,
        timeoutMs: LONG_FILES_RPC_TIMEOUT_MS,
      }),
    );

    try {
      const result = await lastValueFrom(
        this.client
          .send(
            { cmd: 'upload-post-files' },
            {
              files: files.map((file) => ({
                targetId: postId,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                buffer: file.buffer,
              })),
            },
          )
          .pipe(timeout(LONG_FILES_RPC_TIMEOUT_MS)),
      );
      this.logger.log(
        JSON.stringify({
          event: 'files_upload_transport_completed',
          durationMs: Date.now() - startedAt,
          postId,
          fileCount: files.length,
          totalSizeBytes,
        }),
      );
      return result;
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'files_upload_transport_failed',
          durationMs: Date.now() - startedAt,
          postId,
          fileCount: files.length,
          totalSizeBytes,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw error;
    }
  }
  acknowledge(eventId: string): Promise<void> {
    return lastValueFrom(
      this.client
        .send({ cmd: 'post-media-event-ack' }, { eventId })
        .pipe(timeout(5_000)),
    );
  }

  async deletePostMedia(
    images: unknown,
    preview: unknown,
  ): Promise<FilesDeletionResult> {
    for (const fileIds of [getFileIds(images), getFileIds(preview)]) {
      if (!fileIds.length) continue;

      const result = await lastValueFrom(
        this.client
          .send<FilesDeletionResult>({ cmd: 'delete-files' }, { fileIds })
          .pipe(timeout(LONG_FILES_RPC_TIMEOUT_MS)),
      );
      if (result.error) return result;
    }

    return { data: null, error: null };
  }
}

function getFileIds(value: unknown): string[] {
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
