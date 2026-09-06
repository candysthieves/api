import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../../infrastructure/repositories/post-repositories/posts.query.repository.js';
import { PostsMapper } from '../../../api/mappers/posts.mapper.js';
import { PostByIdViewType } from '../../../api/view-types/posts/post-by-id-view.type.js';

export class GetPostByIdQuery {
  constructor(
    public readonly postId: string,
    public readonly currentUserId: string,
  ) {}
}

@QueryHandler(GetPostByIdQuery)
export class GetPostByIdQueryHandler
  implements IQueryHandler<GetPostByIdQuery, PostByIdViewType>
{
  constructor(private readonly postsQueryRepository: PostsQueryRepository) {}

  async execute({
    postId,
    currentUserId,
  }: GetPostByIdQuery): Promise<PostByIdViewType> {
    const post = await this.postsQueryRepository.findByIdOrNotFound(postId);
    const isOwner = post.userId === currentUserId;

    return PostsMapper.toPostByIdView(post, isOwner);
  }
}
