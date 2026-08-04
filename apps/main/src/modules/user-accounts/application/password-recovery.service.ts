import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../repositories/user-repositories/users.repository.js';
import { UserEntity } from '../domain/entities/user.entity.js';
import { DomainExceptions } from '../../../core/exceptions/domain-exceptions.js';

@Injectable()
export class PasswordRecoveryService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUserByValidCode(recoveryCode: string): Promise<UserEntity> {
    const user =
      await this.usersRepository.findByPasswordRecoveryCode(recoveryCode);

    if (!user || !user.isPasswordRecoveryCodeValid(recoveryCode)) {
      DomainExceptions.badRequest('code', 'Invalid or expired recovery code');
    }

    return user;
  }
}
