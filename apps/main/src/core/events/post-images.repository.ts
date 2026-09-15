import { Injectable } from '@nestjs/common';
import { MediaStatus } from '../../generated/prisma/client.js';
import type { MediaFile } from '../../../../../libs/contracts/index.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class PostImagesRepository {
  constructor(private readonly prisma: PrismaService) {}
  async updateImage(
    postId: string,
    index: number,
    image: MediaFile | null,
    mediaStatus: MediaStatus,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "Post"
      SET images = jsonb_set(images, ARRAY[${String(index)}]::text[], ${JSON.stringify(image)}::jsonb, false),
          media_status = ${mediaStatus}::"MediaStatus",
          updated_at = NOW()
      WHERE id = ${postId}::uuid
    `;
  }

  async updatePreview(postId: string, preview: MediaFile): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: { preview },
    });
  }

  async deletePost(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (post) await this.prisma.post.delete({ where: { id: postId } });
  }
}
