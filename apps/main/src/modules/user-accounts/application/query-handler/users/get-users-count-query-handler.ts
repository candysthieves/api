import { ICommandHandler, QueryHandler } from '@nestjs/cqrs';
import { UsersQueryRepository } from '../../../infrastructure/repositories/user-repositories/users.query.repository.js';
import { UsersMapper } from '../../../api/mappers/users.mapper.js';
import { GetUsersCountType } from '../../../api/view-types/users/get-users-count.type.js';

export class GetUsersCountQuery {
  constructor() {}
}

@QueryHandler(GetUsersCountQuery)
export class GetUsersCountQueryHandler implements ICommandHandler<
  GetUsersCountQuery,
  GetUsersCountType
> {
  constructor(private readonly usersQueryRepository: UsersQueryRepository) {}

  async execute(): Promise<GetUsersCountType> {
    const countUser: number = await this.usersQueryRepository.getUsersCount();

    return UsersMapper.toUsersCountView(countUser);
  }
}
