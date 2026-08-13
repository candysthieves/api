import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { NewPasswordDto } from '../../../api/dto/new-password.dto.js';
import { SessionsRepository } from '../../../infrastructure/repositories/session-repositories/sessions.repository.js';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';
import { PasswordRecoveryService } from '../../password-recovery.service.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { UserDataFactory } from '../../factories/user-data.factory.js';
import { UserUpdateInput } from '../../../../../generated/prisma/models/User.js';

export class NewPasswordCommand {
  constructor(public readonly dto: NewPasswordDto) {}
}

@CommandHandler(NewPasswordCommand)
export class NewPasswordUseCase implements ICommandHandler<NewPasswordCommand> {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
    private readonly hashAdapter: HashAdapter,
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async execute({ dto }: NewPasswordCommand): Promise<void> {
    if (dto.newPassword !== dto.newPasswordConfirmation) {
      DomainExceptions.badRequest(
        ErrorStatus.PASSWORDS_NOT_MATCH,
        'newPasswordConfirmation',
        'Passwords must match',
      );
    }

    const user = await this.passwordRecoveryService.getUserByValidCode(
      dto.recoveryCode,
    );

    const updateData: UserUpdateInput =
      UserDataFactory.prepareChangePasswordData(
        await this.hashAdapter.hashPassword(dto.newPassword),
      );

    await this.usersRepository.update(user.id, updateData);
    await this.sessionsRepository.deleteAllActiveByUserId(user.id);
  }
}
