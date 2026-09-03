import { Post } from '../../../../generated/prisma/client.js';
import { PostViewType } from '../view-types/posts/post-view.type.js';
import { GetPostsViewType } from '../view-types/posts/get-posts-view.type.js';
import { FileType } from '../view-types/files/file.type.js';

export class PostsMapper {
  static toView(post: Post): PostViewType {
    return {
      id: post.id,
      description: post.description,
      images: post.images as FileType[],
      preview: post.preview as FileType,
      createdAt: post.createdAt.toISOString(),
      willBeDeleted: post.willBeDeleted?.toISOString() || null,
    };
  }

  static toGetPostsView(
    posts: Post[],
    nextCursor: string | null,
    hasNextPage: boolean,
  ): GetPostsViewType {
    return {
      items: posts.map((post) => this.toView(post)),
      nextCursor,
      hasNextPage,
    };
  }
}
