import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../../infrastructure/repositories/post-repositories/posts.query.repository.js';
import { UsersQueryRepository } from '../../../infrastructure/repositories/user-repositories/users.query.repository.js';
import { PostsMapper } from '../../../api/mappers/posts.mapper.js';

export class FindPostsByUserIdAndCursorQuery {
  constructor(
    public readonly userId: string,
    public readonly currentUserId: string,
    public readonly cursor: string | undefined,
    public readonly limit: number,
  ) {}
}

@QueryHandler(FindPostsByUserIdAndCursorQuery)
export class FindPostsByUserIdAndCursorQueryHandler implements IQueryHandler<FindPostsByUserIdAndCursorQuery> {
  constructor(
    private readonly postsQueryRepository: PostsQueryRepository,
    private readonly usersQueryRepository: UsersQueryRepository,
  ) {}

  async execute({
    userId,
    currentUserId,
    cursor,
    limit,
  }: FindPostsByUserIdAndCursorQuery) {
    const user =
      await this.usersQueryRepository.findByIdOrNotFound(userId);

    const posts = await this.postsQueryRepository.findPostsByUserIdAndCursor(
      user.id,
      cursor,
      limit,
    );

    const hasNextPage = posts.length > limit;

    const items = hasNextPage ? posts.slice(0, limit) : posts;

    const lastPost = items.at(-1);

    const nextCursor =
      hasNextPage && lastPost ? lastPost.createdAt.toISOString() : null;

    const isOwner = user.id === currentUserId;

    return PostsMapper.toGetUserPostsView(
      items,
      nextCursor,
      hasNextPage,
      isOwner,
    );
  }
}
