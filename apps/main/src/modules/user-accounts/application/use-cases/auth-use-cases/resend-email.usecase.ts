import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../../repositories/user-repositories/users.repository.js';
import ms from 'ms';
import { AppConfig } from '../../../../../app.config.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import {
  emailTemplates,
  EmailTemplateType,
} from '../../../../../core/adapters/email/email.templates.js';
import { EmailAdapter } from '../../../../../core/adapters/email/email.adapter.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

export class ResendEmailCommand {
  constructor(public email: string) {}
}

@CommandHandler(ResendEmailCommand)
export class ResendEmailUseCase implements ICommandHandler<ResendEmailCommand> {
  constructor(
    private readonly config: AppConfig,
    private readonly emailAdapter: EmailAdapter,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute({ email }: ResendEmailCommand) {
    const user: UserEntity | null =
      await this.usersRepository.findByEmail(email);

    if (!user) {
      DomainExceptions.badRequest(
        ErrorStatus.EMAIL_NOT_EXISTS,
        'email',
        'Incorrect email',
      );
    }

    const duration: number = ms(
      this.config.emailConfirmationExpiresIn as ms.StringValue,
    );

    const newConfirmationExpiresAt = new Date(Date.now() + duration);

    user.resendEmail(newConfirmationExpiresAt);

    await this.usersRepository.save(user);

    const emailTemplate: EmailTemplateType = emailTemplates.registration(
      user.confirmationCode!,
      this.config.clientUrl,
    );

    await this.emailAdapter.sendEmail(user.email, emailTemplate);
  }
}
