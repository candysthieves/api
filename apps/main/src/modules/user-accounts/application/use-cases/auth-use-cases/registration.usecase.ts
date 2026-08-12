import { RegistrationDto } from '../../../api/dto/registration.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';
import { AppConfig } from '../../../../../app.config.js';
import ms from 'ms';
import { EmailAdapter } from '../../../../../core/adapters/email/email.adapter.js';
import { emailTemplates } from '../../../../../core/adapters/email/email.templates.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { UserDataFactory } from '../../factories/user-data.factory.js';
import { User } from '../../../../../generated/prisma/client.js';
import { UserCreateInput } from '../../../../../generated/prisma/models/User.js';

export class RegistrationCommand {
  constructor(public readonly dto: RegistrationDto) {}
}

@CommandHandler(RegistrationCommand)
export class RegistrationUseCase implements ICommandHandler<RegistrationCommand> {
  constructor(
    private readonly hashAdapter: HashAdapter,
    private readonly usersRepository: UsersRepository,
    private readonly config: AppConfig,
    private readonly emailAdapter: EmailAdapter,
  ) {}

  async execute(command: RegistrationCommand) {
    const { dto } = command;

    if (dto.password !== dto.passwordConfirmation) {
      DomainExceptions.badRequest(
        ErrorStatus.PASSWORDS_NOT_MATCH,
        'passwordConfirmation',
        'Passwords must match',
      );
    }

    const userByEmail: User | null = await this.usersRepository.findByEmail(
      dto.email,
    );

    if (userByEmail) {
      DomainExceptions.badRequest(
        ErrorStatus.EMAIL_ALREADY_EXISTS,
        'email',
        'User with this email is already registered',
      );
    }

    const userByUsername: User | null =
      await this.usersRepository.findByUsername(dto.username);

    if (userByUsername) {
      DomainExceptions.badRequest(
        ErrorStatus.USERNAME_ALREADY_EXISTS,
        'username',
        'Username already exists',
      );
    }

    const duration: number = ms(
      this.config.emailConfirmationExpiresIn as ms.StringValue,
    );

    const confirmationExpiresAt = new Date(Date.now() + duration);

    const hash: string = await this.hashAdapter.hashPassword(dto.password);

    const userData: UserCreateInput = UserDataFactory.registrationData(
      dto.email,
      dto.username,
      hash,
      confirmationExpiresAt,
    );

    const user: User = await this.usersRepository.create(userData);

    if (user.confirmationCode) {
      const emailTemplate = emailTemplates.registration(
        user.confirmationCode,
        this.config.clientUrl,
      );

      await this.emailAdapter.sendEmail(user.email, emailTemplate);
    }
  }
}
