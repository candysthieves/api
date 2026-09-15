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
import { UsersMapper } from './users.mapper.js';

export class PostsMapper {
  static toPostView(post: Post): PostViewType {
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
    const postView = this.toPostView(post);

    return {
      id: postView.id,
      description: postView.description,
      images: postView.images,
      preview: postView.preview,
      createdAt: postView.createdAt,
      id: post.id,
      description: post.description,
      images: post.images as PostImages,
      preview: post.preview as PostPreview,
      createdAt: post.createdAt.toISOString(),
      author: {
        id: post.user.id,
        username: post.user.username,
        avatarUrl: UsersMapper.getDefaultAvatar(),
        avatarPreviewUrl: UsersMapper.getDefaultAvatarPreview(),
      },
      isOwner,
    };
  }

  static toPostWithAuthorView(post: PostWithAuthor): PostWithAuthorViewType {
    const postView = this.toPostView(post);

  static toViewWithAuthor(post: PostWithAuthor): PostWithAuthorViewType {
    return {
      ...postView,
      id: post.id,
      description: post.description,
      images: post.images as PostImages,
      preview: post.preview as PostPreview,
      createdAt: post.createdAt.toISOString(),
      willBeDeleted: post.willBeDeleted?.toISOString() || null,

      author: {
        id: post.user.id,
        username: post.user.username,
        avatarUrl: UsersMapper.getDefaultAvatar(),
        avatarPreviewUrl: UsersMapper.getDefaultAvatarPreview(),
      },
    };
  }

  static toAllPostsView(
    posts: PostWithAuthor[],
    nextCursor: string | null,
    hasNextPage: boolean,
  ): GetAllPostsViewType {
    return {
      items: posts.map((post) => this.toPostWithAuthorView(post)),
      nextCursor,
      hasNextPage,
    };
  }

  static toUserPostsView(
    posts: Post[],
    nextCursor: string | null,
    hasNextPage: boolean,
    isOwner: boolean,
  ): GetUserPostsViewType {
    return {
      items: posts.map((post) => this.toPostView(post)),
      nextCursor,
      hasNextPage,
      isOwner,
    };
  }
}
