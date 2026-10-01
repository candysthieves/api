import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProfileDto } from '../../../api/dto/update-profile.dto.js';
import { UserDataFactory } from '../../factories/user-data.factory.js';
import {
  UsersRepository,
  UserWithLocations,
} from '../../../infrastructure/repositories/user-repositories/users.repository.js';
import { LocationsRepository } from '../../../infrastructure/repositories/locations-repositories/locations.repository.js';
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
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly locationsRepository: LocationsRepository,
  ) {}

  async execute({
    userId,
    dto,
  }: UpdateMyProfileCommand): Promise<MyProfileType> {
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

    const country = dto.countryId
      ? await this.locationsRepository.findCountryById(dto.countryId)
      : null;
    if (dto.countryId && !country) {
      DomainExceptions.badRequest(
        ErrorStatus.VALIDATION_ERROR,
        'countryId',
        'Country not found',
      );
    }

    const city = dto.cityId
      ? await this.locationsRepository.findCityById(dto.cityId)
      : null;
    if (dto.cityId && !city) {
      DomainExceptions.badRequest(
        ErrorStatus.VALIDATION_ERROR,
        'cityId',
        'City not found',
      );
    }

    if (country && city && city.countryId !== country.countryId) {
      DomainExceptions.badRequest(
        ErrorStatus.VALIDATION_ERROR,
        'cityId',
        'City does not belong to the selected country',
      );
    }

    const data = UserDataFactory.prepareUpdateProfileData(dto);

    const hasFieldsToUpdate = Object.values(data).some(
      (val) => val !== undefined,
    );

    if (hasFieldsToUpdate) {
      await this.usersRepository.update(userId, data);
    }

    const user: UserWithLocations =
      await this.usersRepository.findByIdWithLocationsOrNotFound(userId);

    return UsersMapper.toMyProfileView(user);
  }
}
