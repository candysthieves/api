import { Injectable, Logger } from '@nestjs/common';
import { MediaStatus } from '../../generated/prisma/client.js';
import type { MediaFile } from '../../../../../libs/contracts/index.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class PostImagesRepository {
  private readonly logger = new Logger(PostImagesRepository.name);

  constructor(private readonly prisma: PrismaService) {}
  async updateImage(
    postId: string,
    index: number,
    image: MediaFile | null,
    mediaStatus: MediaStatus,
  ): Promise<void> {
    this.logger.log(
      `Post image SQL started: postId=${postId} index=${index} fileId=${image?.fileId ?? 'null'} mediaStatus=${mediaStatus}`,
    );
    const affectedRows = await this.prisma.$executeRaw`
      UPDATE "Post"
      SET images = jsonb_set(images, ARRAY[${String(index)}]::text[], ${JSON.stringify(image)}::jsonb, false),
          media_status = ${mediaStatus}::"MediaStatus",
          updated_at = NOW()
      WHERE id = ${postId}::uuid
    `;
    this.logger.log(
      `Post image SQL completed: postId=${postId} index=${index} affectedRows=${affectedRows}`,
    );
    if (affectedRows === 0) {
      this.logger.warn(
        `Post image SQL matched no rows: postId=${postId} index=${index}`,
      );
    }
  }

  async updatePreview(postId: string, preview: MediaFile): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: { preview },
    });
    this.logger.log(
      `Post preview saved: postId=${postId} fileId=${preview.fileId}`,
    );
  }

  async deletePost(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (post) {
      await this.prisma.post.delete({ where: { id: postId } });
      this.logger.log(`Post deleted after image failure: postId=${postId}`);
    } else {
      this.logger.log(
        `Post deletion skipped: postId=${postId} reason=not_found`,
      );
    }
  }
}
