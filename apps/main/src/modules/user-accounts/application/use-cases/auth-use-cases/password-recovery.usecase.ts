import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import ms from 'ms';
import { AppConfig } from '../../../../../app.config.js';
import { EmailAdapter } from '../../../../../core/adapters/email/email.adapter.js';
import { emailTemplates } from '../../../../../core/adapters/email/email.templates.js';
import { UsersRepository } from '../../../repositories/user-repositories/users.repository.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

export class PasswordRecoveryCommand {
  constructor(public readonly email: string) {}
}

@CommandHandler(PasswordRecoveryCommand)
export class PasswordRecoveryUseCase implements ICommandHandler<PasswordRecoveryCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly config: AppConfig,
    private readonly emailAdapter: EmailAdapter,
  ) {}

  async execute({ email }: PasswordRecoveryCommand): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      DomainExceptions.badRequest(
        ErrorStatus.EMAIL_NOT_EXISTS,
        'email',
        "User with this email doesn't exist",
      );
    }

    const duration = ms(
      this.config.passwordRecoveryExpiresIn as ms.StringValue,
    );
    user.createPasswordRecoveryCode(new Date(Date.now() + duration));
    await this.usersRepository.save(user);

    await this.emailAdapter.sendEmail(
      user.email,
      emailTemplates.passwordRecovery(
        user.passwordRecoveryCode!,
        this.config.clientUrl,
      ),
    );
  }
}
