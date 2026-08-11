import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersQueryRepository } from '../../../repositories/user-repositories/users.query.repository.js';
import { UserMapper } from '../../../mappers/user.mapper.js';
import { ProfileViewType } from '../../../api/view-types/auth/profile-view.type.js';
import { User } from '../../../../../generated/prisma/client.js';

export class ProfileCommand {
  constructor(public readonly userId: string) {}
}

@CommandHandler(ProfileCommand)
export class ProfileUseCase implements ICommandHandler<
  ProfileCommand,
  ProfileViewType
> {
  constructor(private readonly usersQueryRepository: UsersQueryRepository) {}

  async execute({ userId }: ProfileCommand): Promise<ProfileViewType> {
    const user: User =
      await this.usersQueryRepository.findByIdOrNotFound(userId);

    return UserMapper.toProfileView(user);
  }
}
