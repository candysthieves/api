import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { Post } from '../../../../../generated/prisma/client.js';
import { PostWithAuthor } from '../../types/post-with-author.type.js';

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

  async findDeletedPostsByUserIdAndCursor(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ) {
    return this.prismaPost.findMany({
      where: {
        userId,
        willBeDeleted: {
          not: null,
        },
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

  async findPostsByCursor(
    cursor: string | undefined,
    limit: number,
  ): Promise<PostWithAuthor[]> {
    return this.prisma.post.findMany({
      where: {
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
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }
}
