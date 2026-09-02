import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class PostsQueryRepository {
  private readonly prismaPost: PrismaService['post'];
  constructor(private readonly prisma: PrismaService) {
    this.prismaPost = prisma.post;
  }

  async countPostsByUserId(userId: string): Promise<number> {
    return this.prismaPost.count({ where: { userId: userId } });
  }
}
