import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UsersQueryRepository } from '../../../infrastructure/repositories/user-repositories/users.query.repository.js';
import { PostsQueryRepository } from '../../../infrastructure/repositories/post-repositories/posts.query.repository.js';
import { UsersMapper } from '../../../api/mappers/users.mapper.js';
import { GetUserProfileType } from '../../../api/view-types/users/get-user-profile.type.js';

export class GetUserProfileQuery {
  constructor(
    public readonly userId: string,
    public readonly currentUserId: string,
  ) {}
}

@QueryHandler(GetUserProfileQuery)
export class GetUserProfileQueryHandler implements IQueryHandler<
  GetUserProfileQuery,
  GetUserProfileType
> {
  constructor(
    private readonly usersQueryRepository: UsersQueryRepository,
    private readonly postsQueryRepository: PostsQueryRepository,
  ) {}

  async execute({
    currentUserId,
    userId,
  }: GetUserProfileQuery): Promise<GetUserProfileType> {
    const user =
      await this.usersQueryRepository.findByIdOrNotFound(userId);

    const isOwner: boolean = user.id === currentUserId;

    const postsCount = await this.postsQueryRepository.countPostsByUserId(
      user.id,
    );

    return UsersMapper.toGetUserProfileView(user, postsCount, isOwner);
  }
}
