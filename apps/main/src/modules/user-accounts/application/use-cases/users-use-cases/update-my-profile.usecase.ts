import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProfileDto } from '../../../api/dto/update-profile.dto.js';
import { UserDataFactory } from '../../factories/user-data.factory.js';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';
import { UsersMapper } from '../../../api/mappers/users.mapper.js';
import { MyProfileType } from '../../../api/view-types/users/my-profile.type.js';

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

    const user = await this.usersRepository.update(userId, data);

    return UsersMapper.toMyProfileView(user);
  }
}
