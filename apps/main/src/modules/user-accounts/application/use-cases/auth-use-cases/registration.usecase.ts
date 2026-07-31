import { RegistrationDto } from '../../../dto/registration.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { UsersRepository } from '../../../repositories/userRepositories/users.repository.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { AppConfig } from '../../../../../app.config.js';
import ms from 'ms';
import { EmailAdapter } from '../../../../../core/adapters/email/email.adapter.js';
import {
  emailTemplates,
  EmailTemplateType,
} from '../../../../../core/adapters/email/email.templates.js';
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

    const existUser: UserEntity | null =
      await this.usersRepository.findByEmailOrUsername(dto.email, dto.username);

    if (existUser) {
      if (existUser.username === dto.username) {
        DomainExceptions.badRequest('username', 'Username already exists');
      } else if (existUser.email === dto.email) {
        DomainExceptions.badRequest(
          'email',
          'User with this email is already registered',
        );
      }
    }

    const hash: string = await this.hashAdapter.hashPassword(dto.password);

    const duration: number = ms(
      this.config.emailConfirmationExpiresIn as ms.StringValue,
    );

    const confirmationExpiresAt = new Date(Date.now() + duration);

    const newUser: UserEntity = UserEntity.create({
      email: dto.email,
      username: dto.username,
      passwordHash: hash,
      confirmationExpiresAt,
    });

    await this.usersRepository.create(newUser);

    const emailTemplate: EmailTemplateType = emailTemplates.registration(
      newUser.confirmationCode,
    );

    await this.emailAdapter.sendEmail(newUser.email, emailTemplate);
  }
}
