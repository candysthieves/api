import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { Post } from '../../../../../generated/prisma/client.js';
import { PostUncheckedCreateInput } from '../../../../../generated/prisma/models/Post.js';

@Injectable()
export class PostRepository {
  private readonly prismaPost: PrismaService['post'];
  constructor(private readonly prisma: PrismaService) {
    this.prismaPost = prisma.post;
  }

  async createPost(data: PostUncheckedCreateInput): Promise<Post> {
    return this.prismaPost.create({ data });
  }
  async deletePost(id: string): Promise<void> {
    await this.prismaPost.delete({ where: { id } });
  }
}
