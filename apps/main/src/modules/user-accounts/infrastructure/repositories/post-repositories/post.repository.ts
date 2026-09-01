import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { Post } from '../../../../../generated/prisma/client.js';
import { PostUncheckedCreateInput } from '../../../../../generated/prisma/models/Post.js';

@Injectable()
export class PostRepository {
  constructor(private readonly prisma: PrismaService) {}

  createPost(data: PostUncheckedCreateInput): Promise<Post> {
    return this.prisma.post.create({ data });
  }
  deletePost(id: string): Promise<void> {
    return this.prisma.post.delete({ where: { id } }).then(() => undefined);
  }
}
