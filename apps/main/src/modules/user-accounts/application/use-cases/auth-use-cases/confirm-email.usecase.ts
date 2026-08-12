import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { User } from '../../../../../generated/prisma/client.js';
import { UserDataFactory } from '../../factories/user-data.factory.js';
import { UserUpdateInput } from '../../../../../generated/prisma/models/User.js';

export class ConfirmEmailCommand {
  constructor(public readonly code: string) {}
}

@CommandHandler(ConfirmEmailCommand)
export class ConfirmEmailUseCase implements ICommandHandler<ConfirmEmailCommand> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ code }: ConfirmEmailCommand): Promise<void> {
    const user: User | null =
      await this.usersRepository.findByConfirmationCode(code);

    if (!user) {
      DomainExceptions.badRequest(
        ErrorStatus.CONFIRMATION_CODE_INVALID,
        'code',
        'Invalid confirmation code',
      );
    }

    if (user.isEmailConfirmed) {
      DomainExceptions.badRequest(
        ErrorStatus.EMAIL_ALREADY_CONFIRMED,
        'email',
        'Email already confirmed',
      );
    }

    if (user.confirmationExpiresAt < new Date()) {
      DomainExceptions.badRequest(
        ErrorStatus.CONFIRMATION_CODE_EXPIRED,
        'code',
        'Confirmation code expired',
      );
    }

    const data: UserUpdateInput = UserDataFactory.prepareConfirmEmailData();

    await this.usersRepository.update(user.id, data);
  }
}
