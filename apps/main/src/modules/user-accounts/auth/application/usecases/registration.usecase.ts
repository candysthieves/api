import { ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { RegistrationDto } from '../dto/registration.dto.js';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { UsersRepository } from '../../../users/repositories/users.repository.js';
import { BadRequestException } from '@nestjs/common';
import { UserEntity } from '../../../users/ entities/user.entity.js';

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

    // Быстрая страховка для отладки
    if (!dto) {
      console.log('--- RECEIVED COMMAND: ---', command);
      throw new Error('RegistrationCommand payload (dto) is undefined!');
    }

    const existUser = await this.usersRepository.findByEmailOrUsername(
      dto.email,
      dto.username,
    );

    if (existUser) {
      if (existUser.username === dto.username) {
        throw new BadRequestException('Username already exists');
      } else if (existUser.email === dto.email) {
        throw new BadRequestException('Email already exists');
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
