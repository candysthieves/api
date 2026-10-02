import { Injectable } from '@nestjs/common';
import type { MediaFile } from '../../../../../../../libs/contracts/index.js';
import { PostsRepository } from '../../infrastructure/repositories/post-repositories/posts.repository.js';

@Injectable()
export class PostsService {
  constructor(private readonly posts: PostsRepository) {}

  async updateImage(
    postId: string,
    index: number,
    image: MediaFile,
    preview: MediaFile | null,
  ): Promise<boolean> {
    await this.posts.updateImage(postId, index, image);
    if (preview) await this.posts.updatePreview(postId, preview);
    return this.posts.markReadyIfComplete(postId);
  }
}
