import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { S3Adapter } from '../../adapters/s3.adapter.js';

export class GetFilesQuery {
  constructor() {}
}

@QueryHandler(GetFilesQuery)
export class GetFilesQueryHandler implements IQueryHandler<GetFilesQuery> {
  constructor(private readonly s3: S3Adapter) {}

  async execute(query: GetFilesQuery) {
    return await this.s3.getUrl(
      'files/post/ef60ab97-5b61-4bc6-98b5-70250f7b3dc8.webp',
    );
  }
}
