import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { MediaStatus } from '../../../../../generated/prisma/client.js';
import { PostWithAuthor } from '../../types/post-with-author.type.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

@Injectable()
export class PostsQueryRepository {
  private readonly prismaPost: PrismaService['post'];
  constructor(private readonly prisma: PrismaService) {
    this.prismaPost = prisma.post;
  }

  async findByIdOrNotFound(postId: string): Promise<PostWithAuthor> {
    const post = await this.prismaPost.findFirst({
      where: {
        id: postId,
        willBeDeleted: null,
        mediaStatus: MediaStatus.READY,
        images: {
          not: [],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!post) {
      DomainExceptions.notFound(
        ErrorStatus.POST_NOT_FOUND,
        'postId',
        'Post not found',
      );
    }

    return post;
  }

  async findDeletedByIdOrNotFound(postId: string): Promise<PostWithAuthor> {
    const post = await this.prismaPost.findFirst({
      where: {
        id: postId,
        willBeDeleted: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!post) {
      DomainExceptions.notFound(
        ErrorStatus.POST_NOT_FOUND,
        'postId',
        'Post not found',
      );
    }

    return post;
  }

  async countPostsByUserId(userId: string): Promise<number> {
    return this.prismaPost.count({ where: { userId: userId } });
  }

  async findPostsByUserIdAndCursor(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<PostWithAuthor[]> {
    return this.prismaPost.findMany({
      where: {
        userId,
        willBeDeleted: null,
        images: {
          not: [],
        },
        ...(cursor && {
          createdAt: {
            lt: new Date(cursor),
          },
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
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
  ): Promise<PostWithAuthor[]> {
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
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
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
        willBeDeleted: null,
        images: {
          not: [],
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
