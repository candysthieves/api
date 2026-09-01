import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
export const FILES_TCP_CLIENT = 'FILES_TCP_CLIENT';
export type PostMediaJobAcceptance = {
  data: { accepted: true; eventId: string } | null;
  error: { code: string; errors: { field: string; message: string }[] } | null;
};
@Injectable()
export class FilesTcpClient {
  constructor(@Inject(FILES_TCP_CLIENT) private readonly client: ClientProxy) {}
  async uploadPostFiles(
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
  async acknowledge(eventId: string): Promise<void> { await lastValueFrom(this.client.send({ cmd: 'post-media-event-ack' }, { eventId }).pipe(timeout(5000))); }
}
