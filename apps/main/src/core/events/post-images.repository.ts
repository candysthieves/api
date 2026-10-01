import { Injectable } from '@nestjs/common';
import type { MediaFile } from '../../../../../libs/contracts/index.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class PostImagesRepository {
  constructor(private readonly prisma: PrismaService) {}
  async updateImage(
    postId: string,
    index: number,
    image: MediaFile,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "Post"
      SET images = jsonb_set(images, ARRAY[${String(index)}]::text[], ${JSON.stringify(image)}::jsonb, false),
          updated_at = NOW()
      WHERE id = ${postId}::uuid
        AND images -> ${index}::int = 'null'::jsonb
    `;
  }

  async updatePreview(postId: string, preview: MediaFile): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "Post" SET preview = ${JSON.stringify(preview)}::jsonb, updated_at = NOW()
      WHERE id = ${postId}::uuid AND (preview IS NULL OR preview = 'null'::jsonb)
    `;
  }

  async markReadyIfComplete(postId: string): Promise<boolean> {
    // The conditional UPDATE chooses one winner even across main replicas.
    const affectedRows = await this.prisma.$executeRaw`
      UPDATE "Post"
      SET media_status = 'READY'::"MediaStatus", updated_at = NOW()
      WHERE id = ${postId}::uuid
        AND media_status = 'PROCESSING'::"MediaStatus"
        AND jsonb_typeof(images) = 'array'
        AND images <> '[]'::jsonb
        AND NOT (images @> '[null]'::jsonb)
        AND jsonb_typeof(preview) = 'object'
    `;
    return affectedRows === 1;
  }
}
