import { BadRequestException } from '@nestjs/common';
import { RegistrationDto } from '../../../dto/registration.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { UsersRepository } from '../../../repositories/userRepositories/users.repository.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';

export class RegistrationCommand {
  constructor(public readonly dto: RegistrationDto) {}
}

@CommandHandler(RegistrationCommand)
export class RegistrationUseCase implements ICommandHandler<RegistrationCommand> {
  constructor(
    private readonly hashAdapter: HashAdapter,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(command: RegistrationCommand) {
    const { dto } = command;

    if (dto.password !== dto.passwordConfirmation) {
      throw new BadRequestException('Passwords must match');
    }

    const existUser: UserEntity | null =
      await this.usersRepository.findByEmailOrUsername(dto.email, dto.username);

    if (existUser) {
      if (existUser.username === dto.username) {
        throw new BadRequestException(
          'User with this username is already registered',
        );
      } else if (existUser.email === dto.email) {
        throw new BadRequestException(
          'User with this email is already registered',
        );
      }
    }

    const hash: string = await this.hashAdapter.hashPassword(dto.password);

    const newUser: UserEntity = UserEntity.create({
      email: dto.email,
      username: dto.username,
      passwordHash: hash,
    });

    await this.usersRepository.save(newUser);
  }
}
