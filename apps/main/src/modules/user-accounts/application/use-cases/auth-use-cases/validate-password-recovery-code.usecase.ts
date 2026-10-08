import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PasswordRecoveryService } from '../../services/password-recovery.service.js';

export class ValidatePasswordRecoveryCodeCommand {
  constructor(public readonly recoveryCode: string) {}
}

@CommandHandler(ValidatePasswordRecoveryCodeCommand)
export class ValidatePasswordRecoveryCodeUseCase implements ICommandHandler<ValidatePasswordRecoveryCodeCommand> {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  async execute({
    recoveryCode,
  }: ValidatePasswordRecoveryCodeCommand): Promise<void> {
    await this.passwordRecoveryService.getUserByValidCode(recoveryCode);
  }
}
