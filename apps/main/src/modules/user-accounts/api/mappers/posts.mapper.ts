import { Post } from '../../../../generated/prisma/client.js';
import type {
  PostImages,
  PostPreview,
} from '../../../../core/types/prisma/json-types.js';
import { PostViewType } from '../view-types/posts/post-view.type.js';
import { PostByIdViewType } from '../view-types/posts/post-by-id-view.type.js';
import { GetAllPostsViewType } from '../view-types/posts/get-posts-view.type.js';
import { GetUserPostsViewType } from '../view-types/posts/get-user-posts-view.type.js';
import { PostWithAuthor } from '../../infrastructure/types/post-with-author.type.js';
import { PostWithAuthorViewType } from '../view-types/posts/post-with-author-view.type.js';

export class PostsMapper {
  static toView(post: Post): PostViewType {
    return {
      id: post.id,
      description: post.description,
      images: post.images as PostImages,
      preview: post.preview as PostPreview,
      createdAt: post.createdAt.toISOString(),
      willBeDeleted: post.willBeDeleted?.toISOString() || null,
    };
  }

  static toPostByIdView(
    post: PostWithAuthor,
    isOwner: boolean,
  ): PostByIdViewType {
    return {
      id: post.id,
      description: post.description,
      images: post.images as PostImages,
      preview: post.preview as PostPreview,
      createdAt: post.createdAt.toISOString(),
      author: {
        id: post.user.id,
        username: post.user.username,
      },
      isOwner,
    };
  }

  static toViewWithAuthor(post: PostWithAuthor): PostWithAuthorViewType {
    return {
      id: post.id,
      description: post.description,
      images: post.images as PostImages,
      preview: post.preview as PostPreview,
      createdAt: post.createdAt.toISOString(),
      willBeDeleted: post.willBeDeleted?.toISOString() || null,

      author: {
        id: post.user.id,
        username: post.user.username,
      },
    };
  }

  static toGetAllPostsView(
    posts: PostWithAuthor[],
    nextCursor: string | null,
    hasNextPage: boolean,
  ): GetAllPostsViewType {
    return {
      items: posts.map((post) => this.toViewWithAuthor(post)),
      nextCursor,
      hasNextPage,
    };
  }

  static toGetUserPostsView(
    posts: Post[],
    nextCursor: string | null,
    hasNextPage: boolean,
    isOwner: boolean,
  ): GetUserPostsViewType {
    return {
      items: posts.map((post) => this.toView(post)),
      nextCursor,
      hasNextPage,
      isOwner,
    };
  }
}
