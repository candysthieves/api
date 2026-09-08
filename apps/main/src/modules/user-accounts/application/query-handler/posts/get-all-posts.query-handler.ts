import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../../infrastructure/repositories/post-repositories/posts.query.repository.js';
import { PostsMapper } from '../../../api/mappers/posts.mapper.js';
import { PostWithAuthor } from '../../../infrastructure/types/post-with-author.type.js';
import { paginateByCursor } from '../../../../../core/helpers/cursor-pagination.helper.js';

export class GetAllPostsQuery {
  constructor(
    public readonly cursor: string | undefined,
    public readonly limit: number,
  ) {}
}

@QueryHandler(GetAllPostsQuery)
export class GetAllPostsQueryHandler implements IQueryHandler<GetAllPostsQuery> {
  constructor(private readonly postsQueryRepository: PostsQueryRepository) {}

  async execute({ cursor, limit }: GetAllPostsQuery) {
    const posts: PostWithAuthor[] =
      await this.postsQueryRepository.findPostsByCursor(cursor, limit);

    const { items, nextCursor, hasNextPage } = paginateByCursor(posts, limit);

    return PostsMapper.toGetAllPostsView(items, nextCursor, hasNextPage);
  }
}
