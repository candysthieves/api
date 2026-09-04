import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../../infrastructure/repositories/post-repositories/posts.query.repository.js';
import { UsersQueryRepository } from '../../../infrastructure/repositories/user-repositories/users.query.repository.js';
import { PostsMapper } from '../../../api/mappers/posts.mapper.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

export class FindDeletedPostsByUserIdAndCursorQuery {
  constructor(
    public readonly userId: string,
    public readonly currentUserId: string,
    public readonly cursor: string | undefined,
    public readonly limit: number,
  ) {}
}

@QueryHandler(FindDeletedPostsByUserIdAndCursorQuery)
export class FindDeletedPostsByUserIdAndCursorQueryHandler
  implements IQueryHandler<FindDeletedPostsByUserIdAndCursorQuery>
{
  constructor(
    private readonly postsQueryRepository: PostsQueryRepository,
    private readonly usersQueryRepository: UsersQueryRepository,
  ) {}

  async execute({
    userId,
    currentUserId,
    cursor,
    limit,
  }: FindDeletedPostsByUserIdAndCursorQuery) {
    const user = await this.usersQueryRepository.findByIdOrNotFound(userId);

    if (user.id !== currentUserId) {
      DomainExceptions.forbidden(
        ErrorStatus.POST_ACCESS_FORBIDDEN,
        'userId',
        'You do not have permission to view deleted posts of this user',
      );
    }

    const posts =
      await this.postsQueryRepository.findDeletedPostsByUserIdAndCursor(
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
