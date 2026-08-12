import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';
import ms from 'ms';
import { AppConfig } from '../../../../../app.config.js';
import {
  emailTemplates,
  EmailTemplateType,
} from '../../../../../core/adapters/email/email.templates.js';
import { EmailAdapter } from '../../../../../core/adapters/email/email.adapter.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { User } from '../../../../../generated/prisma/client.js';
import { UserDataFactory } from '../../factories/user-data.factory.js';

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
    const user: User | null = await this.usersRepository.findByEmail(email);

    if (!user) {
      DomainExceptions.badRequest(
        ErrorStatus.EMAIL_NOT_EXISTS,
        'email',
        'Incorrect email',
      );
    }

    if (user.isEmailConfirmed) {
      DomainExceptions.badRequest(
        ErrorStatus.EMAIL_ALREADY_CONFIRMED,
        'email',
        'Email already confirmed',
      );
    }

    const duration: number = ms(
      this.config.emailConfirmationExpiresIn as ms.StringValue,
    );

    const newConfirmationExpiresAt = new Date(Date.now() + duration);

    const passwordRecoveryCode = crypto.randomUUID();

    const userData = UserDataFactory.prepareResendEmailData(
      passwordRecoveryCode,
      newConfirmationExpiresAt,
    );

    await this.usersRepository.update(user.id, userData);

    const emailTemplate: EmailTemplateType = emailTemplates.registration(
      passwordRecoveryCode,
      this.config.clientUrl,
    );

    await this.emailAdapter.sendEmail(user.email, emailTemplate);
  }
}
