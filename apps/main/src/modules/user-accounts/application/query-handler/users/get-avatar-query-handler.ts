import { ICommandHandler, QueryHandler } from '@nestjs/cqrs';
import { UsersMapper } from '../../../api/mappers/users.mapper.js';
import { GetMyAvatarType } from '../../../api/view-types/users/get-my-avatar.type.js';
import { UsersQueryRepository } from '../../../infrastructure/repositories/user-repositories/users.query.repository.js';

export class GetAvatarQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetAvatarQuery)
export class GetAvatarQueryHandler implements ICommandHandler<
  GetAvatarQuery,
  GetMyAvatarType
> {
  constructor(private readonly usersQueryRepository: UsersQueryRepository) {}

  async execute(command: GetAvatarQuery): Promise<GetMyAvatarType> {
    const user = await this.usersQueryRepository.findByIdOrNotFound(
      command.userId,
    );
    return UsersMapper.toGetMyAvatarView(user);
  }
}
