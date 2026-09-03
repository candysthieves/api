import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
export const FILES_TCP_CLIENT = 'FILES_TCP_CLIENT';
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
  constructor(@Inject(FILES_TCP_CLIENT) private readonly client: ClientProxy) {}
  uploadPostFiles(
    postId: string,
    files: Express.Multer.File[],
  ): Promise<PostMediaJobAcceptance> {
    return lastValueFrom(
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
        .pipe(timeout(15_000)),
    );
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
          .pipe(timeout(15_000)),
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
