import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { Post } from '../../../../../generated/prisma/client.js';

@Injectable()
export class PostsQueryRepository {
  private readonly prismaPost: PrismaService['post'];
  constructor(private readonly prisma: PrismaService) {
    this.prismaPost = prisma.post;
  }

  async countPostsByUserId(userId: string): Promise<number> {
    return this.prismaPost.count({ where: { userId: userId } });
  }

  async findPostsByUserIdAndCursor(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ) {
    return this.prismaPost.findMany({
      where: {
        userId,
        ...(cursor && {
          createdAt: {
            lt: new Date(cursor),
          },
        }),
      },

      orderBy: {
        createdAt: 'desc',
      },

      take: limit + 1,
    });
  }

  async getPostsWithPagination(
    cursor: string | undefined,
    limit: number,
  ): Promise<Post[]> {
    return this.prismaPost.findMany({
      where: cursor
        ? {
            createdAt: {
              lt: new Date(cursor),
            },
          }
        : undefined,

      orderBy: {
        createdAt: 'desc',
      },

      take: limit + 1,
    });
  }
}
