import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProfileDto } from '../../../api/dto/update-profile.dto.js';
import { UserDataFactory } from '../../factories/user-data.factory.js';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';
import { UsersMapper } from '../../../api/mappers/users.mapper.js';
import { MyProfileType } from '../../../api/view-types/users/my-profile.type.js';
import { User } from '../../../../../generated/prisma/client.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

export class UpdateMyProfileCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: UpdateProfileDto,
  ) {}
}

@CommandHandler(UpdateMyProfileCommand)
export class UpdateMyProfileUseCase implements ICommandHandler<
  UpdateMyProfileCommand,
  MyProfileType
> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({
    userId,
    dto,
  }: UpdateMyProfileCommand): Promise<MyProfileType> {
    const data = UserDataFactory.prepareUpdateProfileData(dto);

    if (dto.username) {
      const userByUsername: User | null =
        await this.usersRepository.findByUsername(dto.username);

      if (userByUsername && userByUsername.id !== userId) {
        DomainExceptions.badRequest(
          ErrorStatus.USERNAME_ALREADY_EXISTS,
          'username',
          'Username already exists',
        );
      }
    }

    const hasFieldsToUpdate = Object.values(data).some(
      (val) => val !== undefined,
    );

    const user = hasFieldsToUpdate
      ? await this.usersRepository.update(userId, data)
      : await this.usersRepository.findByIdOrNotFound(userId);

    return UsersMapper.toMyProfileView(user);
  }
}
