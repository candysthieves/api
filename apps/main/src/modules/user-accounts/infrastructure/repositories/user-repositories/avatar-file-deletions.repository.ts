import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { getFileIds } from '../../../../../core/events/files-tcp.client.js';

@Injectable()
export class AvatarFileDeletionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async scheduleCurrentAvatarForDeletion(userId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: userId },
        select: { avatar: true, avatarPreview: true },
      });

      if (!user) {
        DomainExceptions.notFound(
          ErrorStatus.USER_NOT_FOUND,
          'userId',
          'User not found',
        );
      }

      const fileIds = new Set([
        ...getFileIds(user.avatar),
        ...getFileIds(user.avatarPreview),
      ]);

      if (fileIds.size) {
        await transaction.avatarFileDeletion.createMany({
          data: [...fileIds].map((fileId) => ({ fileId })),
          skipDuplicates: true,
        });
      }

      await transaction.user.update({
        where: { id: userId },
        data: { avatar: null, avatarPreview: null },
      });
    });
  }

  findDue(now: Date) {
    return this.prisma.avatarFileDeletion.findMany({
      where: { deleteAt: { lte: now } },
      orderBy: { deleteAt: 'asc' },
    });
  }

  async deleteScheduled(fileIds: string[]): Promise<void> {
    await this.prisma.avatarFileDeletion.deleteMany({
      where: { fileId: { in: fileIds } },
    });
  }
}
