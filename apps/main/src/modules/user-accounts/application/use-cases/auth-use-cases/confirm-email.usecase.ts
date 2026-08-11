import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../../repositories/user-repositories/users.repository.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

export class ConfirmEmailCommand {
  constructor(public readonly code: string) {}
}

@CommandHandler(ConfirmEmailCommand)
export class ConfirmEmailUseCase implements ICommandHandler<ConfirmEmailCommand> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ code }: ConfirmEmailCommand) {
    const prismaUser = await this.usersRepository.findByConfirmationCode(code);
    if (!prismaUser) {
      DomainExceptions.badRequest(
        ErrorStatus.CONFIRMATION_CODE_INVALID,
        'code',
        'Invalid confirmation code',
      );
    }

    const user = UserEntity.restore(prismaUser);

    user.confirmEmail();

    await this.usersRepository.save(user);
  }
}
