import { RegistrationDto } from '../../../dto/registration.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { UsersRepository } from '../../../repositories/user-repositories/users.repository.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { AppConfig } from '../../../../../app.config.js';
import ms from 'ms';
import { EmailAdapter } from '../../../../../core/adapters/email/email.adapter.js';
import { emailTemplates } from '../../../../../core/adapters/email/email.templates.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';

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
      DomainExceptions.badRequest('password', 'Passwords must match');
    }

    const userByEmail = await this.usersRepository.findByEmail(dto.email);
    const userByUsername = await this.usersRepository.findByUsername(
      dto.username,
    );

    if (
      userByUsername &&
      (!userByEmail || userByUsername.id !== userByEmail.id)
    ) {
      DomainExceptions.badRequest('username', 'Username already exists');
    }

    const duration = ms(
      this.config.emailConfirmationExpiresIn as ms.StringValue,
    );

    const confirmationExpiresAt = new Date(Date.now() + duration);

    if (userByEmail) {
      if (userByEmail.isEmailConfirmed) {
        DomainExceptions.badRequest(
          'email',
          'User with this email is already registered',
        );
      }

      const hash = await this.hashAdapter.hashPassword(dto.password);

      userByEmail.update(dto.username, hash, confirmationExpiresAt);

      await this.usersRepository.save(userByEmail);

      const emailTemplate = emailTemplates.registration(
        userByEmail.confirmationCode,
        this.config.clientUrl,
      );

      await this.emailAdapter.sendEmail(userByEmail.email, emailTemplate);

      return;
    }

    const hash = await this.hashAdapter.hashPassword(dto.password);

    const newUser = UserEntity.create(
      dto.email,
      dto.username,
      hash,
      confirmationExpiresAt,
    );

    await this.usersRepository.create(newUser);

    const emailTemplate = emailTemplates.registration(
      newUser.confirmationCode,
      this.config.clientUrl,
    );

    await this.emailAdapter.sendEmail(newUser.email, emailTemplate);
  }
}
