import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';

export class GetPostsQuery {
  constructor() {}
}

@QueryHandler(GetPostsQuery)
export class GetPostsQueryHandler implements IQueryHandler<GetPostsQuery> {
  constructor(private readonly s3: S3Adapter) {}

  async execute(query: GetPostsQuery) {
    return await this.s3.getUrl(
      'files/post/ef60ab97-5b61-4bc6-98b5-70250f7b3dc8.webp',
    );
  }
}
