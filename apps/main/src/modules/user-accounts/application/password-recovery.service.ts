import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersRepository } from '../repositories/userRepositories/users.repository.js';
import { UserEntity } from '../domain/entities/user.entity.js';

@Injectable()
export class PasswordRecoveryService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUserByValidCode(recoveryCode: string): Promise<UserEntity> {
    const user =
      await this.usersRepository.findByPasswordRecoveryCode(recoveryCode);

    if (!user || !user.isPasswordRecoveryCodeValid(recoveryCode)) {
      throw new BadRequestException('Invalid or expired recovery code');
    }

    return user;
  }
}
