import { PostAuthorViewType } from '../view-types/posts/post-author-view.type.js';
import {
  PostAuthor,
  PostWithAuthor,
} from '../../infrastructure/types/post-with-author.type.js';
import { UsersMapper } from './users.mapper.js';
import { PostViewType } from '../view-types/posts/post-view.type.js';
import { PostByIdViewType } from '../view-types/posts/post-by-id-view.type.js';
import { PostWithAuthorViewType } from '../view-types/posts/post-with-author-view.type.js';
import { GetAllPostsViewType } from '../view-types/posts/get-posts-view.type.js';
import { GetUserPostsViewType } from '../view-types/posts/get-user-posts-view.type.js';
import { UserViewerStatus } from '../../../../core/enums/user-viewer-status.enum.js';

export class PostsMapper {
  static toAuthorView(author: PostAuthor): PostAuthorViewType {
    return {
      id: author.id,
      username: author.username,
      avatarPreviewUrl: UsersMapper.getDefaultAvatarPreview(),
    };
  }

  static toPostView(post: PostWithAuthor): PostViewType {
    return {
      id: post.id,
      description: post.description,
      images: post.images,
      preview: post.preview,
      createdAt: post.createdAt.toISOString(),
      willBeDeleted: post.willBeDeleted?.toISOString() || null,
      author: this.toAuthorView(post.user),
    };
  }

  static toPostByIdView(
    post: PostWithAuthor,
    viewerStatus: UserViewerStatus,
  ): PostByIdViewType {
    const postView: Partial<PostViewType> = this.toPostView(post);
    delete postView.willBeDeleted;

    return {
      ...(postView as Omit<PostViewType, 'willBeDeleted'>),
      viewerStatus,
    };
  }

  static toPostWithAuthorView(post: PostWithAuthor): PostWithAuthorViewType {
    return this.toPostView(post);
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
    posts: PostWithAuthor[],
    nextCursor: string | null,
    hasNextPage: boolean,
    viewerStatus: UserViewerStatus,
  ): GetUserPostsViewType {
    return {
      items: posts.map((post) => this.toPostView(post)),
      nextCursor,
      hasNextPage,
      viewerStatus,
    };
  }
}
