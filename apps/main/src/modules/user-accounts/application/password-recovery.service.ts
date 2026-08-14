import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../infrastructure/repositories/user-repositories/users.repository.js';
import { DomainExceptions } from '../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../core/exceptions/domain-exception-code.js';
import { User } from '../../../generated/prisma/client.js';

@Injectable()
export class PasswordRecoveryService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUserByValidCode(recoveryCode: string): Promise<User> {
    const user =
      await this.usersRepository.findByPasswordRecoveryCode(recoveryCode);

    if (!user) {
      DomainExceptions.badRequest(
        ErrorStatus.RECOVERY_CODE_INVALID,
        'recoveryCode',
        'Invalid recovery code',
      );
    }

    if (
      user.passwordRecoveryExpiresAt === null ||
      user.passwordRecoveryExpiresAt <= new Date()
    ) {
      DomainExceptions.badRequest(
        ErrorStatus.RECOVERY_CODE_EXPIRED,
        'recoveryCode',
        'Recovery code has expired',
      );
    }

    return user;
  }
}
