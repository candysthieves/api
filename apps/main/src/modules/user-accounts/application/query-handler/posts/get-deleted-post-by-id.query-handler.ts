import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../../infrastructure/repositories/post-repositories/posts.query.repository.js';
import { PostsMapper } from '../../../api/mappers/posts.mapper.js';
import { PostWithAuthorViewType } from '../../../api/view-types/posts/post-with-author-view.type.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

export class GetDeletedPostByIdQuery {
  constructor(
    public readonly postId: string,
    public readonly currentUserId: string,
  ) {}
}

@QueryHandler(GetDeletedPostByIdQuery)
export class GetDeletedPostByIdQueryHandler
  implements IQueryHandler<GetDeletedPostByIdQuery, PostWithAuthorViewType>
{
  constructor(private readonly postsQueryRepository: PostsQueryRepository) {}

  async execute({
    postId,
    currentUserId,
  }: GetDeletedPostByIdQuery): Promise<PostWithAuthorViewType> {
    const post =
      await this.postsQueryRepository.findDeletedByIdOrNotFound(postId);

    if (post.userId !== currentUserId) {
      DomainExceptions.forbidden(
        ErrorStatus.POST_ACCESS_FORBIDDEN,
        'postId',
        'You do not have permission to view this deleted post',
      );
    }

    return PostsMapper.toViewWithAuthor(post);
  }
}
