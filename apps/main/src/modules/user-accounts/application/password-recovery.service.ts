import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../repositories/user-repositories/users.repository.js';
import { UserEntity } from '../domain/entities/user.entity.js';
import { DomainExceptions } from '../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../core/exceptions/domain-exception-code.js';

@Injectable()
export class PasswordRecoveryService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUserByValidCode(recoveryCode: string): Promise<UserEntity> {
    const user =
      await this.usersRepository.findByPasswordRecoveryCode(recoveryCode);

    if (!user) {
      DomainExceptions.badRequest(
        ErrorStatus.RECOVERY_CODE_INVALID,
        'recoveryCode',
        'Invalid recovery code',
      );
    }

    if (!user.isPasswordRecoveryCodeValid(recoveryCode)) {
      DomainExceptions.badRequest(
        ErrorStatus.RECOVERY_CODE_EXPIRED,
        'recoveryCode',
        'Recovery code has expired',
      );
    }

    return user;
  }
}
