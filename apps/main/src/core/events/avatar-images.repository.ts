import { Injectable } from '@nestjs/common';
import type { MediaFile } from '../../../../../libs/contracts/index.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class AvatarImagesRepository {
  constructor(private readonly prisma: PrismaService) {}
  async applyAvatar(
    userId: string,
    image: MediaFile,
    preview: MediaFile,
  ): Promise<boolean> {
    const imageJson = JSON.stringify(image);
    const previewJson = JSON.stringify(preview);
    const count = await this.prisma.$executeRaw`
      UPDATE "User" SET avatar = ${imageJson}::jsonb, avatar_preview = ${previewJson}::jsonb, updated_at = NOW()
      WHERE id = ${userId}
        AND (avatar IS DISTINCT FROM ${imageJson}::jsonb OR avatar_preview IS DISTINCT FROM ${previewJson}::jsonb)
    `;
    return count === 1;
  }
}
