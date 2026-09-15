import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { Post } from '../../../../../generated/prisma/client.js';
import { PostUncheckedCreateInput } from '../../../../../generated/prisma/models/Post.js';
import { getFileIds } from '../../../../../core/events/files-tcp.client.js';

@Injectable()
export class PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(data: PostUncheckedCreateInput): Promise<Post> {
    return this.prisma.post.create({ data });
  }

  async findById(id: string): Promise<Post | null> {
    return this.prisma.post.findUnique({ where: { id } });
  }

  async deletePost(id: string): Promise<void> {
    await this.prisma.post.delete({ where: { id } });
  }

  async updateDescription(id: string, description: string): Promise<void> {
    await this.prisma.post.update({ where: { id }, data: { description } });
  }

  async markForDeletion(id: string, willBeDeleted: Date): Promise<void> {
    await this.prisma.post.update({ where: { id }, data: { willBeDeleted } });
  }

  async restore(id: string): Promise<void> {
    await this.prisma.post.update({
      where: { id },
      data: { willBeDeleted: null },
    });
  }

  async findPostsDueForDeletion(now: Date): Promise<Post[]> {
    return this.prisma.post.findMany({
      where: { willBeDeleted: { lte: now } },
      orderBy: { willBeDeleted: 'asc' },
    });
  }

  async getAllActivePostMediaFileIds(): Promise<string[]> {
    const posts = await this.prisma.post.findMany({
      select: {
        images: true,
        preview: true,
      },
    });

    const fileIds = new Set<string>();
    for (const post of posts) {
      for (const id of getFileIds(post.images)) {
        fileIds.add(id);
      }
      for (const id of getFileIds(post.preview)) {
        fileIds.add(id);
      }
    }

    return Array.from(fileIds);
  }
}
