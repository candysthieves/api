import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../../repositories/userRepositories/users.repository.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';

export class ConfirmEmailCommand {
  constructor(public readonly code: string) {}
}

@CommandHandler(ConfirmEmailCommand)
export class ConfirmEmailUseCase implements ICommandHandler<ConfirmEmailCommand> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ code }: ConfirmEmailCommand) {
    const prismaUser = await this.usersRepository.findByConfirmationCode(code);

    if (!prismaUser) {
      DomainExceptions.badRequest('code', 'Invalid confirmation code');
    }

    const user = UserEntity.restore(prismaUser);

    user.confirmEmail();

    await this.usersRepository.save(user);
  }
}
