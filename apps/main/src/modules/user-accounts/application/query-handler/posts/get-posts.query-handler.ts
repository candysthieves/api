import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../../infrastructure/repositories/post-repositories/posts.query.repository.js';

export class GetPostsQuery {
  constructor(
    public readonly cursor: string | undefined,
    public readonly limit: number,
  ) {}
}

@QueryHandler(GetPostsQuery)
export class GetPostsQueryHandler implements IQueryHandler<GetPostsQuery> {
  constructor(private readonly postsQueryRepository: PostsQueryRepository) {}

  async execute({ cursor, limit }: GetPostsQuery) {
    const posts = await this.postsQueryRepository.getPostsWithPagination(
      cursor,
      limit,
    );

    const hasNextPage: boolean = posts.length > limit;
  }
}
