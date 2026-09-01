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

  findById(id: string): Promise<Post | null> {
    return this.prisma.post.findUnique({ where: { id } });
  }

  deletePost(id: string): Promise<void> {
    return this.prisma.post.delete({ where: { id } }).then(() => undefined);
  }

  markForDeletion(id: string, willBeDeleted: Date): Promise<void> {
    return this.prisma.post
      .update({ where: { id }, data: { willBeDeleted } })
      .then(() => undefined);
  }

  findPostsDueForDeletion(now: Date): Promise<Post[]> {
    return this.prisma.post.findMany({
      where: { willBeDeleted: { lte: now } },
      orderBy: { willBeDeleted: 'asc' },
    });
  }
}
