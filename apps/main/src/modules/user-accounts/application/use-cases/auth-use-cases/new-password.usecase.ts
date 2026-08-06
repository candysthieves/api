import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { NewPasswordDto } from '../../../dto/new-password.dto.js';
import { SessionsRepository } from '../../../repositories/session-repositories/sessions.repository.js';
import { UsersRepository } from '../../../repositories/user-repositories/users.repository.js';
import { PasswordRecoveryService } from '../../password-recovery.service.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';

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
      DomainExceptions.badRequest('password', 'Passwords must match');
    }

    const user = await this.passwordRecoveryService.getUserByValidCode(
      dto.recoveryCode,
    );
    user.changePassword(await this.hashAdapter.hashPassword(dto.newPassword));
    await this.usersRepository.save(user);
    await this.sessionsRepository.deleteAllActiveByUserId(user.id);
  }
}
