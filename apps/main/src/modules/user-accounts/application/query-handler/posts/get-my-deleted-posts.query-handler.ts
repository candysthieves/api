import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../../infrastructure/repositories/post-repositories/posts.query.repository.js';
import { PostsMapper } from '../../../api/mappers/posts.mapper.js';
import { GetAllPostsViewType } from '../../../api/view-types/posts/get-posts-view.type.js';

export class GetMyDeletedPostsQuery {
  constructor(
    public readonly userId: string,
    public readonly cursor: string | undefined,
    public readonly limit: number,
  ) {}
}

@QueryHandler(GetMyDeletedPostsQuery)
export class GetMyDeletedPostsQueryHandler
  implements IQueryHandler<GetMyDeletedPostsQuery, GetAllPostsViewType>
{
  constructor(private readonly postsQueryRepository: PostsQueryRepository) {}

  async execute({
    userId,
    cursor,
    limit,
  }: GetMyDeletedPostsQuery): Promise<GetAllPostsViewType> {
    const posts =
      await this.postsQueryRepository.findDeletedPostsByUserIdAndCursor(
        userId,
        cursor,
        limit,
      );

    const hasNextPage = posts.length > limit;
    const items = hasNextPage ? posts.slice(0, limit) : posts;
    const lastPost = items.at(-1);

    const nextCursor =
      hasNextPage && lastPost ? lastPost.createdAt.toISOString() : null;

    return PostsMapper.toGetAllPostsView(items, nextCursor, hasNextPage);
  }
}
